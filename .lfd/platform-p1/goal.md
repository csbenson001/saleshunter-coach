# Goal: SalesHunter Platform P1 — the money path is real and metered

Mode: **A** (feature/system build)

Spec: `docs/superpowers/specs/2026-08-17-saleshunter-platform-design.md`
Contract: `docs/cloud-backend-contract.md`

**Outcome:** the real, unmodified Coach desktop app — with **zero API keys
configured** — signs in, runs a meeting, and produces structured AI output against
our platform, and every token is metered accurately enough to bill.

---

## Why the eval is the real client

The eval is **not** a mock, a persona script, or a hand-written integration test.
It is Coach's actual shipped binary pointed at the platform. That client is already
a hostile verifier: it wedges if `/me` returns 401 instead of 200-with-null, its
structured features fail if `response_format` is dropped, it 404s if audio lands
after the summary. **A backend that satisfies the real client cannot be faked with
mocks**, which is what makes this the target.

---

## Stage 0 — Build to spec (inner loop)

Implement P0 + P1 from the spec. Unit + contract tests green. **Do not score against
the outer-loop target until Stage 0 is green.** Tests stay green every cycle.

---

## Target (outer loop)

**One number: `JOURNEYS_PASSED / 9`, at 9/9, with `BYOK_KEYS_SET == 0`.**

The nine journeys, run by `harness/journey.sh` against the real client:

| # | Journey | Fails if |
|---|---|---|
| 1 | Loopback sign-in completes | token never reaches `127.0.0.1/cb` |
| 2 | `/me` returns the user | wrong shape, or 401 on a *live* token |
| 3 | Dead token signs out **cleanly** | `/me` returns non-200 → client wedges |
| 4 | Live meeting streams findings | `streamObject` schema rejected |
| 5 | Debrief report generates | `streamText` truncated or timed out |
| 6 | Ask answers, grounded in transcript | — |
| 7 | Delivery scorecard generates | `generateObject` schema rejected |
| 8 | Quota exhausted → **402** → out-of-credits UI | client crashes instead of prompting |
| 9 | Metering reconciles within **±2%** of vendor-reported usage | platform under-counts |

**Both directions are penalized.** Journeys-passed alone invites disabling quota so
8 always passes; metering accuracy alone invites metering a constant. Both must hold
simultaneously.

**A+ bar (above SHIP):** 9/9 journeys · metering within ±2% · Judge ≥ 4.5 avg with
no dimension < 4 · 0 GIANT cookies · 0 findings from the red-team agent that survive
verification.

A **VOID** result means a fence was tripped. The harness reports VOID and *not which
fence* — naming it turns the lint into an oracle.

---

## Constraints (the fences)

- **Wall-clock:** 6 hours — check `status.sh` every cycle; flat gradient at high
  burn ⇒ stop.
- **Spend:** $50 on a **disposable vendor key with a provider-side limit**.
- **Max iterations:** 6, then escalate.
- **Allowed surface:** the platform service repo, `parley/` client config, and a
  **Supabase branch off `jmpxxnqrxmmlqytdrvyk`**.
- **Database fence — verified 2026-08-17, not assumed.** Chris cleared the Revenue
  project for modification ("nobody is using it yet"). Checked directly: **2 auth
  users, 1 ever signed in** — no customers, correct. But it is **not empty**. It
  holds one workspace with real configuration work: a playbook with **28 criteria**
  across 7 categories, 2 scored calls with 14 score dimensions, 74 practice turns,
  and **4 rows in `workspace_provider_credentials`** (BYOK API keys).
  Therefore: the loop runs against a **branch**, and merges only after the bar is
  hit. Rebuilding a 28-criterion playbook by hand is not a cost worth accepting to
  save one command. If Chris overrides this, take a `pg_dump` snapshot first.
- **Forbidden surface — hard stop, no exceptions:**
  - **Direct writes to `jmpxxnqrxmmlqytdrvyk` main.** Branch only.
  - The Nexeo Salesforce production org (`salesforce-nexeoplastics` is *live
    production CRM* — there is no sandbox).
  - `.env` values, secrets, `goal.md` itself, `harness/`, `eval/`.
  - `ijkmwlsvpwxxtmbcijnh` (sales-hunter-live) is **verified empty** — zero rows in
    every public table — so consolidating away from it costs nothing. Do not
    resurrect it.
- **Methodology:** **no mock data, no stubbed vendor.** The upstream model provider
  must actually be called. No canned completions, no fixture responses.
- **Capacity caps:** no per-journey special-casing. Zero branches keyed on fixture
  content — see the entropy rule.

---

## Instruments (one command per constraint AND the target)

| Measures | Command |
|---|---|
| Target: journeys | `harness/journey.sh` → `N/9` |
| BYOK keys must be 0 | `harness/assert-no-byok.sh` |
| Metering vs vendor truth | `harness/reconcile.sh` → `±%` |
| Real vendor was called | `harness/assert-live-vendor.sh` (vendor usage API for the window) |
| Structured output is genuine | `harness/assert-fresh-entities.sh` |
| Contract landmines | `harness/contract.sh` (`/me` 200-null, 401≠403, tombstone, PUT-before-POST, opaque `meta`) |
| Mid-stream disconnect still bills | `harness/abort-mid-stream.sh` |
| typecheck / lint | `npm run typecheck && npm run lint` |
| no mock/hardcoded data | `harness/no-mocks.sh` (grep gate) |
| secrets scan | `gitleaks detect` |
| prod-Supabase untouched | `harness/assert-prod-untouched.sh` |
| wall-clock + spend | `harness/status.sh` |

**A constraint without an instrument is a vibe.** Every fence above has a command.

---

## Forced entropy — the anti-cheat that matters most

**The transcript fixture is regenerated every cycle.** Speaker names, company names,
seat counts, dates, and dollar figures are randomized per run and the expected
entities are derived from *that* run's fixture.

This directly kills the cheapest cheat: returning canned JSON that satisfies the
schema. `assert-fresh-entities.sh` fails unless the model output references entities
that **did not exist before this cycle started**. A hardcoded or memorized response
cannot reference a company name generated ninety seconds ago.

Per cycle:
- **Overfit reflection:** generalizing or special-casing? If special-casing, the next
  change **removes** a fixture-shaped artifact rather than adding one.
- **Stall rule:** metric flat for one cycle ⇒ next attempt is a *structural* change.
  Same-knob-harder is banned.
- **Log:** hypothesis + expected failure mode + diagnostic, written **before** the
  code change.

---

## Cheat museum for THIS target

Enumerated before the run; each has a fence.

| # | The five-minute cheat | Fence |
|---|---|---|
| 1 | Stub the proxy, return canned schema-valid JSON | `assert-fresh-entities.sh` + `assert-live-vendor.sh` |
| 2 | Meter a constant, or meter nothing | `reconcile.sh` ±2% vs vendor usage API |
| 3 | Meter what reached the client (under-counts on abort) | `abort-mid-stream.sh` |
| 4 | Set quota infinite so journey 8 never fires | journey 8 asserts a **402 was observed** |
| 5 | `/me` always returns a user | journey 3 uses a deliberately revoked token |
| 6 | Test with a 3-token prompt so streaming never strains | fixture is a full-length meeting transcript |
| 7 | Run against a mock client, claim the real one | `journey.sh` drives the **built** app bundle |
| 8 | Leave a BYOK key set and call it hosted | `assert-no-byok.sh` |
| 9 | Hardcode the model, bypass alias resolution | contract test asserts alias → vendor mapping |
| 10 | Swallow errors so failures look like passes | journeys assert positive artifacts, not absence of throw |
| 11 | Edit the harness or the scorer | `harness/` read-only; checksum asserted in `status.sh` |
| 12 | Develop against prod Supabase "just to unblock" | `assert-prod-untouched.sh` + forbidden surface |

---

## Agents (maker ≠ checker)

I conduct. Work is split so **no agent grades its own output**:

| Agent | Role | May write code? |
|---|---|---|
| **Builder** | Implements a phase against the spec | Yes — service + tests only |
| **Contract-verifier** | Runs `journey.sh` + `contract.sh`, reports raw results | No |
| **Red-team** | Actively tries to make the metric pass without real capability; files exhibits | No — writes only to the museum |
| **Judge** | Grades the rubric below, A–F, having *not* written any of it | No |

The Judge and Red-team must run in **fresh contexts** that never saw the Builder's
reasoning — otherwise they inherit its blind spots.

### Judge rubric (5 dimensions, 1–5)

1. **Contract fidelity** — does the real client behave correctly, including the landmines?
2. **Metering integrity** — could a customer cost more than they're billed?
3. **Security** — token handling, tenant isolation, secret hygiene, no prod exposure.
4. **Operability** — can a failure be diagnosed at 2am? Logs, health, rollback.
5. **Test quality** — would these tests *catch* the regression, or just cover the line?

SHIP floor: ≥4.0 avg, no dim <3. **A+ bar: ≥4.5 avg, no dim <4.**

---

## Stop conditions

- **Bar hit:** 9/9 + ±2% + Judge A+ + red-team clean ⇒ SHIP.
- Any budget exhausted ⇒ STOP.
- Marginal gain ≈ 0 for 2 consecutive cycles ⇒ STOP.
- Iterations > 6 ⇒ STOP and escalate.
- **Any prod-Supabase access attempt ⇒ HALT IMMEDIATELY**, do not continue, page Chris.

On stop: final report in `LOG.md` — best score, what generalized, what was abandoned,
what a human must decide.
