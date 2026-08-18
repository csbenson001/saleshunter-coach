# Cloud backend contract — what replacing `api.parley.tw` actually requires

Scoping for repointing `CLOUD_URL` away from upstream (Pathors AI) onto
infrastructure we control. Written 2026-08-17 from a read of the client source;
the upstream backend itself lives in a private `parley-internal` repo and is
**not available to us**, so this contract was reconstructed from the callers.

---

## TL;DR

**The client is not the problem — one build variable moves everything. The
server is the problem: it is ~30 HTTP endpoints plus a stateful WebSocket relay,
and our existing `saleshunter-live` backend implements almost none of it.**

Recommended sequence:

1. **Ship BYOK-only now** (`VITE_COACH_CLOUD=false`). Deletes the dependency
   entirely, today, with zero backend work. Every feature still works because
   BYOK paths never touch a backend.
2. Build the hosted tier only when a customer refuses to manage their own keys.
3. When that happens, budget for the STT relay leaving Vercel — see §6.

---

## 1. Repointing the client

`CLOUD_URL` is a single **build-time** constant
([`src/lib/cloud/client.ts:12`](../src/lib/cloud/client.ts#L12)):

```
VITE_COACH_CLOUD_URL  →  falls back to https://api.parley.tw
```

Everything derives from it, including things that look independent:

| Surface | How it derives |
|---|---|
| Auth, `/me`, sync, folders, orgs | `${CLOUD_URL}${path}` via `cloudFetch` |
| Hosted LLM | `provider.ts:83` overrides the registry base URL with `${CLOUD_URL}/v1` |
| Hosted STT relay | scheme-swapped: `CLOUD_URL.replace(/^http/, "ws") + "/stt/stream"` |
| Rust STT client | receives the relay URL from the frontend; refuses to start without it |

**Gotcha:** neither release job sets `VITE_COACH_CLOUD_URL`, so shipped builds
bake in `api.parley.tw`. Repointing means editing
`.github/workflows/release.yml`, not just a local `.env`.

Also hardcoded outside the constant:

- `src/lib/ai/providers.ts:185` — dead literal (overridden at runtime), cosmetic.
- Mobile defaults: `CloudClient.swift:14`, `SttRelayClient.swift:35`,
  `SttRelayClient.kt:342`, `CloudClient.kt:316`. All are overridable constants.
- **`ios/App/Coach/SettingsView.swift:435-437` and `OnboardingView.swift:156`
  link to upstream's Privacy Policy, support, and marketing site.** This is a
  compliance problem independent of any backend decision: the app currently
  presents *Pathors AI's* privacy policy as governing our users' recordings.
  Fix before any App Store submission.

## 2. Auth

| Endpoint | Notes |
|---|---|
| `GET /desktop/sign-in?to=<loopback>` | Opened in the **system browser**, not fetched. Must run Google OAuth then redirect to `<to>?token=…` or `<to>?error=…`. `to` is `http://127.0.0.1:<ephemeral>/cb`. Backend must allowlist loopback targets. |
| `GET /sign-in?to=` | Mobile equivalent — same semantics. |
| `GET /me` | → `{ user: {id,name,email,image?} \| null, activeOrganizationId }` |
| `POST /auth/sign-out` | Bearer, body ignored; failure is invisible (local state clears first). |
| `GET /me/usage` | → `HostedQuota` (stt seconds, llm credits, `periodResetTs`). |
| `DELETE /me` | Mobile only. `409 {code:"owned_organizations"}` while the user still owns an org. |

Auth is `Authorization: Bearer <opaque Better Auth session token>` on everything
except the sign-in handoff.

> **Contract that will bite you:** an expired/invalid token must return
> **`200` with `user: null`** from `/me`, *not* `401`. A non-2xx is treated as a
> network blip and the session is **kept** — so returning 401/500 for a dead
> token leaves users wedged in a signed-in state that never recovers.

## 3. Status-code contract (global)

`cloudFetch` ([`client.ts:173`](../src/lib/cloud/client.ts#L173)) branches on
status, so these are load-bearing across every endpoint:

| Status | Client behavior |
|---|---|
| **401** | Session is dead → **wipes stored auth and signs the user out.** Use *only* for expired/missing tokens. |
| **403** | Resource-level denial → session preserved, shown as a toast. Use for permission failures. |
| **402** | "Out of credits" UI. Meaningful on `/v1` and the STT upgrade. |
| **409** | Only `owned_organizations`, only on `DELETE /me`. |

Swapping 401 and 403 silently logs users out on any permission error.

## 4. LLM proxy — `POST /v1/chat/completions`

OpenAI-compatible, via the Vercel AI SDK's `createOpenAICompatible`.

- **Model aliases**: `saleshunter-coach-fast` (realtime lane),
  `saleshunter-coach-smart` (deep lane). The server maps these to real upstream
  models; the client never names a vendor model.
- **Streaming required** — SSE `chat.completion.chunk` deltas. Used by
  `streamObject` (live timeline findings, action items) and `streamText`
  (report, Ask).
- **Structured output required** — the client sends
  `response_format: {type:"json_schema", …, strict}`. There is a fallback to
  `{type:"json_object"}` (every such system prompt contains the literal word
  "json"), but *some* schema-constrained mode must work.
- **No tool/function calling** on this path.
- Errors: `402` → out-of-credits UI; `401` or a body containing `unauthorized`
  → re-login UI. A standard `{error:{message}}` body with the right status is enough.

## 5. Recordings, folders, organizations

**Recordings** (6): `GET /recordings`, `PUT /recordings/:id/audio` (raw
`audio/ogg` body — no multipart, no chunking), `POST /recordings/:id`
(`{summary, meta}` → `{updatedAt}`), `GET /recordings/:id/meta` (returns the
entry **unwrapped**), `GET /recordings/:id/audio`, `DELETE /recordings/:id`
(must **tombstone**, or the sync sweep resurrects it).

> **Ordering invariant:** the audio `PUT` must complete *before* the summary
> `POST`, or a row advertises `hasAudio` before the blob exists and every other
> device 404s on download.

> **Store `meta` opaquely.** Desktop writes fields mobile does not know about;
> round-tripping must not drop unknown keys.

**Folders** (9 endpoints): personal CRUD with client-supplied ids (idempotent
upsert), plus org-scoped equivalents and a move-recording-to-folder PATCH.

**Organizations** (12 endpoints): four are **Better Auth organization-plugin**
routes (`/auth/organization/create`, `invite-member`,
`list-user-invitations`, `accept-invitation`) — i.e. adopting this contract
means adopting Better Auth's org plugin shape, not just writing routes. The
rest are custom `/orgs/*` routes, two of which return **bare arrays** rather
than wrapped objects. Sharing is client-orchestrated (share → delete original);
there is no server-side move.

## 6. STT relay — WebSocket, and the reason this can't be Vercel

`wss://<host>/stt/stream?feature=meeting|voice_typing|realtime`

- **Auth**: `Authorization: Bearer <session token>` as an HTTP header on the
  upgrade. No subprotocol, no query token.
- **Must be a byte-for-byte Soniox proxy** that injects the vendor key: first
  frame is the client's JSON config with `api_key` omitted, then raw 16 kHz mono
  s16le PCM binary frames, `{"type":"keepalive"}` every 2 s, `{"type":"finalize"}`
  at the end.
- **The client never closes its write half.** The relay must forward `finalize`,
  stream Soniox's flushed tail back, then close the socket itself.
- Errors: `402` on upgrade → quota UI; `401` → auth UI; mobile also reads a
  close code `1011` whose reason contains "quota".

This is a long-lived, stateful, bidirectional connection. **Vercel serverless
functions cannot host it** — our existing backend caps streaming at
`maxDuration = 60` and its own comments reject proxying audio as "too slow +
too expensive". A hosted STT tier means a persistent-connection runtime
(Railway, Fly, a container), not a Next.js route.

## 7. Gap vs. `saleshunter-live/backend`

What that backend **already has and we would genuinely reuse**: Supabase-JWT
bearer auth (`lib/auth.ts`), Stripe checkout / billing portal / webhooks,
plan gating, a profile store, and a usage table.

What it **does not have**:

| Need | Status there |
|---|---|
| OpenAI-compatible `/v1/chat/completions` | **Absent.** `/api/proxy/anthropic` is Anthropic-Messages-shaped both ways. |
| Structured output | **Absent — and actively stripped.** It whitelist-builds the upstream payload from `model, max_tokens, system, messages, stream`, dropping `tools`/`response_format`, and filters the response to `type === 'text'`, discarding tool blocks. Our timeline, delivery, action-items, todos and finding-solution paths all use `generateObject`/`streamObject` and would fail. |
| Recording sync + audio storage | **Absent.** No Supabase Storage usage at all; no recordings/transcripts tables. `usage_sessions` is a billing counter. |
| STT relay | **Absent by design** (see §6). |
| Loopback OAuth | **Absent.** It redirects to a custom scheme with tokens **in the URL query string** — which lands in OS logs and can be claimed by any app registering the scheme. Our desktop client expects a `127.0.0.1` loopback. |
| Folders / organizations | Absent. |
| CORS / OPTIONS | Absent (fine for native clients, fatal for a browser one). |

Two pre-existing issues in that backend worth fixing regardless: PRO users get
**unmetered, unlogged LLM spend** against our Anthropic key (`system_mode` is
declared but explicitly unused), and Deepgram keys are minted with a 30-minute
TTL, **no revocation, and no rate limit on minting**.

## 8. Recommendation

Adopting this contract wholesale means implementing ~30 endpoints, Better
Auth's organization plugin, blob storage, and a stateful relay on a runtime we
do not currently use — to replicate a hosted tier whose only advantage over
BYOK is that the user does not paste two API keys.

**Ship BYOK-only.** It removes the upstream dependency immediately, keeps every
feature working, and matches the "local-first, bring your own keys" positioning
already in the README. Revisit the hosted tier when a paying customer asks for
it, and scope it from this document.

If a hosted tier is needed sooner, the cheapest useful subset is **auth +
`/v1` + usage** (skip recordings sync, folders, orgs, and the relay; let STT
stay BYOK). That is a few endpoints on Vercel, reusing the Supabase auth we
already run, and it avoids the runtime change entirely.
