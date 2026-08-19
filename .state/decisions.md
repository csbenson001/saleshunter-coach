# Decision Log

Append-only. Newest first.

---

## 2026-08-19 (mobile) — The native apps are the WeFlow-parity mobile base

**Supersedes the consolidation plan's "delete parley mobile" recommendation.**

Chris installed WeFlow's shipping app and captured its sign-in flow. Read off
those screenshots, WeFlow's mobile architecture is:

1. Salesforce is the **only** identity provider — one button, no account system.
2. Native system OAuth: macOS prompts `"Weflow AI.app" Wants to Use
   "api.getweflow.app" to Sign In`, which is `ASWebAuthenticationSession` pointed
   at **their** origin, not at Salesforce directly.
3. Standard Connected App consent at
   `login.salesforce.com/?startURL=%2Fsetup%2Fsecur%2FRemoteAccessAuthorizationPage.apexp`.
4. Exactly three scopes requested: `id` ("Access the identity URL service"),
   `api` ("Manage user data via APIs"), and `refresh_token` ("Perform requests at
   any time"). No `openid`, no `full`, no `web`. A minimal ask, deliberately.
5. The entitlement gate is **server-side and keyed to the Salesforce org**:
   after consent succeeded, the app returned "Mobile app access is not enabled
   for your organization."

*Inferred, not observed:* the code exchange happens on their server (the auth
session targets their origin), so the device never holds a Salesforce refresh
token, and that same grant powers their server-side email and calendar capture.

**This repo already implements that flow.** `ios/App/Coach/AppState.swift:119`
opens an `ASWebAuthenticationSession` against a server-hosted `/sign-in` page and
completes on `saleshunter-coach://auth/cb?token=…`;
`android/.../auth/AuthManager.kt` and `CustomTabsLauncher.kt` mirror it with a
Custom Tab and say so in their own comments. Plus `OggOpusEncoder` (tested on
both platforms), `MicCapture`/`AudioCapture`, `PendingUploadQueue` and a
`CloudClient` whose 401 discipline does not sign a user out on a flaky network.

The consolidation plan judged these apps unshippable and recommended deleting
`ios/` and `android/`. On the narrow question of matching WeFlow's mobile
Salesforce capability that judgement was wrong: this is the closest asset in the
portfolio, on both platforms, and the hard native work is done.

**The delta is small:** add Salesforce as a provider on the hosted sign-in page,
terminate the code exchange server-side, and port the Expo app's extraction
verifier, confirm gate and idempotency ledger across.

**Two deliberate departures from WeFlow:**

1. **Both identity paths, not Salesforce-only.** WeFlow can be Salesforce-only
   because it is Salesforce-native — no CRM, no product. SalesHunter's structural
   advantage is working with no CRM at all. "Continue with Salesforce" becomes a
   first-class button that also provisions the CRM connection in one consent,
   alongside ordinary sign-in.
2. **No dead end after a successful auth.** Chris authenticated correctly and was
   told to contact his administrator. Ours authenticates, then says what is
   available and what needs enabling, and lets the rep use the non-CRM half
   meanwhile.

**Tail cost:** the desktop app in this repo stays cold while its mobile siblings
ship, so the repo has two speeds at once. `ios/` and `android/` were slated for
deletion and are now load-bearing, which means their upstream-fork provenance
now matters more, not less.

**Open:** which backend terminates the Salesforce OAuth and holds the refresh
token — `saleshunter-revenue` or `saleshunter-platform` — is deliberately
deferred until the running audit reports on the state of revenue's Salesforce
chain.

## 2026-08-19 — Cold until the Nexeo pilot closes

No feature work here for two weeks. Full reasoning in
`saleshunter-revenue/.state/decisions.md`, entry 2026-08-19. The exception is
the three customer-facing falsehoods in [risks.md](risks.md).

## 2026-08-18 — Coach supersedes `saleshunter-live` as the desktop app

Coach is better code; `saleshunter-live` had the commercial scaffolding.
Chris chose Coach. **Tail cost:** `saleshunter-live` keeps the only Windows
capture implementation, so it is frozen rather than archived, and Coach is
macOS-only until that ports.

*Note: an independent survey the same night reached the opposite conclusion —
keep `saleshunter-live` as the shell, freeze parley. That survey's reasoning
(commercial scaffolding is expensive and already built; superior DSP is a
nice-to-have) is worth reading before reversing this, in
`saleshunter-revenue/docs/competitive/2026-08-18-suite-consolidation-plan.md` §2.*

## 2026-08-17 — Fork rather than rewrite, with attribution kept

Rebranded Parley to SalesHunter Coach under Apache-2.0, attribution intact.
**Tail cost:** 337 of 339 commits are someone else's, upstream's remote is still
configured, and every merge from upstream is a decision rather than a routine.
