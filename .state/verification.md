# Verification Ledger

**VERIFIED** means someone exercised it and observed the real result.
**ASSUMED** means it typechecks, tests pass, or upstream said so.

Almost everything here is inherited, which makes the distinction sharper than
usual: upstream's verification is evidence about upstream's build, not this fork's.

## VERIFIED

| Capability | How | When |
|---|---|---|
| The rebrand compiles and the repo is English-only | `3f8c57b` — language picker, `opencc-js` conversion pass, Chinese filler vocabulary and zh-Hant/zh-rTW resources removed; `AppLanguage` is a single-member union so TypeScript flags any new locale branch | 2026-08-17 |

## ASSUMED

| Capability | What is unproven | Cheapest way to prove it |
|---|---|---|
| On-device diarization, prosody DSP, replay-as-of, MCP server, voice typing | Real in upstream. Never run by Chris in this fork | Build and run the app once |
| Signed / notarized build | No build has been produced under the Vandelay Consulting Developer ID | Provision the cert, run the release job |
| Any cloud feature | Points at `api.parley.tw`, a server we do not own. Nothing has ever called `saleshunter-platform` | Set `VITE_COACH_CLOUD_URL`, sign in once |
| iOS / Android | Never submitted under this account | Out of scope; recommended for deletion |
