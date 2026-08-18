# SalesHunter Platform — design

Date: 2026-08-17 · Status: approved design, pre-implementation

A licensed, monetized hosted backend serving the SalesHunter product suite,
replacing the upstream `api.parley.tw` dependency. **Not BYOK.**

---

## 1. Product decisions made before design

| Decision | Choice |
|---|---|
| Purchase model | Self-serve **seat subscription**. The account is the license; entitlement is a server-side check. No license keys, no offline activation. |
| v1 scope | **All four**: hosted AI, hosted transcription, cloud recording sync, organizations/seats. |
| Runtime | **One Node service on Railway** (approach A). HTTP + WebSocket in one process. |
| Desktop product | **Coach wins.** `saleshunter-live`'s Electron shell is retired; its auth, Stripe wiring, and WASAPI module are harvested. |
| Identity | **Consolidate onto Revenue's Supabase project** (`jmpxxnqrxmmlqytdrvyk`). |

### Target suite

```
Coach    (Tauri desktop + iOS/Android)  — live capture & coaching
Revenue  (Next.js web)                  — scoring, playbook, rehearsal
Platform (Node/Hono on Railway
          + Supabase + Stripe)          — identity, entitlement, billing,
                                          LLM proxy, STT relay, storage
```

**Why this consolidation.** Before this design there were three products, two
Supabase projects, and two desktop apps solving the same problem — Coach (Tauri,
richer features, macOS-only, no backend) and `saleshunter-live` (Electron, weaker
features, but Windows capture and a working Stripe backend). The `feature/parley-parity`
branch had been rebuilding Coach's features inside `saleshunter-live` while Coach
itself was separately forked. Funding both is how a small team ships neither.

---

## 2. Identity & entitlement

**Billing subject is a workspace, not a user.** Revenue already models workspaces;
a solo rep gets a workspace of one. Entitlement resolves three questions:

1. Does this workspace have an active plan?
2. Does that plan include this **product**?
3. Does this user hold a **seat**?

```
entitlements(workspace_id, product, plan, seats, status, current_period_end)
```

The `product` dimension costs nothing now and is the reason adding Revenue to a
customer's bill later is a row rather than a migration.

**The platform issues its own opaque session tokens.** It must not hand clients a
raw Supabase JWT. The Coach client stores one opaque bearer and has **no refresh
logic** — it calls `/me`, and a `null` user means signed out. Supabase access
tokens expire hourly, so passing them through would silently log every user out
once an hour across three client apps. The platform maps its opaque token to a
Supabase session server-side and handles refresh itself. Zero client changes.

**Sign-in** is the loopback flow the desktop client already implements:
`GET /desktop/sign-in?to=http://127.0.0.1:<port>/cb` → OAuth → redirect to
`<to>?token=…`. Loopback targets must be allowlisted. This replaces
`saleshunter-live`'s current pattern of returning tokens **in a URL query string**
to a custom scheme handler, which leaks into OS logs and can be claimed by any app
registering the scheme.

---

## 3. Service topology

One Node service, **Hono** (or Fastify), on Railway. The existing Next.js route
handlers port over — roughly 1,000 lines across 14 routes, about a day — because
Next.js App Router route handlers **cannot upgrade a connection to a WebSocket**.
Keeping Next would mean a second process and would forfeit the single-runtime
benefit the runtime decision was made for. Supabase and Stripe integrations move
unchanged; they are SDK calls.

---

## 4. LLM proxy and metering

`POST /v1/chat/completions`, **OpenAI-compatible**, because that is what all three
clients speak through the Vercel AI SDK.

Two requirements the current `/api/proxy/anthropic` does not meet, and cannot be
adapted to without a rewrite:

- **`response_format: json_schema` must pass through.** Coach's timeline, delivery
  scorecard, action items, todos, and finding-solutions are all
  `generateObject`/`streamObject` calls. The current proxy whitelist-builds its
  upstream payload from `model, max_tokens, system, messages, stream` — dropping
  `tools` and `response_format` — and filters the response to `type === 'text'`,
  discarding tool blocks. Every structured feature fails against it.
- **Streaming SSE with no 60-second ceiling.**

Model aliases (`saleshunter-coach-fast`, `saleshunter-coach-smart`) resolve
server-side, so vendor or model changes ship without a client release. (Note the
Anthropic defaults in the client registry still name `claude-opus-4-8`; the
current family is Claude 5.)

**Metering.** Pre-flight rejects with **402** when the workspace balance is
exhausted; actual usage is debited on completion from the **upstream's** usage
report, not from what reached the client — a mid-stream client disconnect still
incurs vendor cost. **Hard cap by default**, per-workspace override. This closes
the hole in the current backend, where PRO users have unmetered, unlogged spend
against the server's key.

---

## 5. Transcription relay

WebSocket, in the same process. Stays **Soniox**: Coach parses that wire protocol
in Rust, Swift, and Kotlin, so switching vendors means rewriting three parsers.

The relay accepts the upgrade with `Authorization: Bearer <token>` as an HTTP
header, injects the vendor key the client deliberately omits, and otherwise proxies
frames byte-for-byte.

Two non-obvious behaviors, both silent-failure sources:

- The client **never closes its write half**. The relay must forward `finalize`,
  stream the vendor's flushed tail back, then close the socket itself.
- Quota exhaustion surfaces as **402 on the upgrade**, or a close code **1011**
  whose reason mentions quota. That is what the clients already branch on.

Metered in seconds, attributed by the `feature` parameter the client already sends
(`meeting`, `voice_typing`, `realtime`).

---

## 6. Recording storage

**Supabase Storage for v1, behind a narrow blob interface.** R2's zero egress is
the right answer at scale, but it is a second vendor and credential set on day one,
and Opus audio is small (a 30-minute call is a few megabytes). The interface makes
a later swap a class, not a migration.

Three client contract details that are not negotiable:

- The audio `PUT` must complete **before** the summary `POST`, or other devices see
  `hasAudio: true` and 404 on download.
- `DELETE` must **tombstone**. A hard delete lets the sync sweep resurrect the row.
- `meta` must round-trip **opaquely** (`jsonb`). Desktop writes fields mobile does
  not know about; dropping unknown keys silently corrupts records.

**Server-side retention**, configurable per workspace, defaulting to 30 days for
audio — matching the policy already shipped locally in `saleshunter-live`. It is
the first question an enterprise security review asks.

---

## 7. Error contract (global)

Client behavior is pinned to status codes. These are load-bearing across every
endpoint:

| Status | Client behavior |
|---|---|
| **401** | Session dead → **wipes stored auth, signs the user out.** Use *only* for expired/missing tokens. |
| **403** | Resource denial → session preserved, shown as a toast. |
| **402** | Out-of-credits UI. Meaningful on `/v1` and the relay upgrade. |
| **409** | Only `owned_organizations`, only on `DELETE /me`. |

Swapping 401 and 403 logs users out on any permission error.

`GET /me` must return **200 with `user: null`** for a dead token — never 401. A
non-2xx is treated by the client as a network blip and the session is *kept*, so
the obvious implementation wedges users in a signed-in state that never recovers.

---

## 8. Rollout

Five phases, each independently shippable:

| Phase | Delivers | Done when |
|---|---|---|
| **P0** Foundation | Supabase consolidation, Hono service on Railway, identity, opaque tokens, `/me` | Coach signs in against our infrastructure |
| **P1** Money path | LLM proxy, schema passthrough, streaming, metering, Stripe entitlement | **First billable moment** — Coach works with no LLM key pasted |
| **P2** Relay | Hosted STT | No BYOK key remains |
| **P3** Recordings | Sync, storage, retention | Library syncs across devices |
| **P4** Teams | Orgs, seats, sharing | A team can buy seats and share |

The **Windows port** runs as a parallel client-side track, independent of all of it.

---

## 9. Testing

Three layers, because the failure modes differ:

- **Contract tests** pin the behaviors that silently corrupt clients: `/me`
  200-with-null, 401-vs-403, delete tombstoning, audio-before-summary ordering,
  opaque `meta` round-trip.
- **Relay integration tests** over a real WebSocket with recorded Soniox frames.
  Its bugs live in close semantics, which unit tests cannot see.
- **Adversarial metering tests**: disconnect mid-stream, concurrent requests racing
  one quota, a client that stops reading. This is where money leaks.

---

## 10. Out of scope for v1

License keys / offline activation · SSO / SAML / SCIM · self-hosted deployments ·
R2 migration · a browser capture client (see `web/capture-test/` — the echo probe
is unrun, and browser capture cannot hear a native Teams client anyway).

---

## Appendix — inherited liabilities to fix, not carry

1. `saleshunter-live` mints Deepgram keys with a 30-minute TTL, **no revocation and
   no rate limit on minting**.
2. PRO users have **unmetered, unlogged LLM spend** against the server key
   (`system_mode` is declared but never used).
3. `PATCH /api/profile` shallow-merges arbitrary keys into `preferences`, the same
   subtree entitlement policy reads.
4. Coach's iOS app links to **upstream's Privacy Policy** (fixed 2026-08-17 via
   `CoachLinks.swift`, pending a real URL) and the `website/` legal pages routed
   privacy requests to `contact@pathors.com` (fixed, contact is a placeholder).
