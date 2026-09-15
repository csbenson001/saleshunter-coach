# SAL-5 Holdout Replay Evaluation Scorecard

**Date:** 2026-09-14  
**Engine revision:** `6d15074` (`fix: harden in-call HUD native boundaries`)  
**Evaluator:** Call Replay Evaluator  
**Isolation:** No protected holdout transcript or audio content was copied or disclosed.

## Verdict

**FAIL — holdout certification unavailable.**

The protected Krisp/Weflow/Nexeo corpus is not mounted in this evaluator workspace. The
repository's available scripts are deterministic proving-ground simulations; they do not
emit prospect-utterance-completion timestamps, suggestion-render timestamps, independent
`gpt-5.6-luna` grades, or ground-truth interruption events. Missing measurements cannot
be treated as a pass.

## Required gate metrics

| Metric | Hard threshold | Measured result | Status |
|---|---:|---:|---|
| Prospect completion → suggestion render P95 | < 2000 ms | Not measured | **FAIL / unavailable** |
| Any single-run latency | ≤ 2500 ms | Not measured | **FAIL / unavailable** |
| Average relevance | ≥ 4.0 / 5.0 | Not measured | **FAIL / unavailable** |
| Average actionability | ≥ 4.0 / 5.0 | Not measured | **FAIL / unavailable** |
| False-interruption rate | 0% required by SAL-5 | Not measured | **FAIL / unavailable** |

## Timestamped holdout excerpts

None available. The protected corpus was not mounted, so no verbatim transcript text,
objection timestamps, or suggestion excerpts were accessed. This preserves holdout
isolation from the builder.

## Non-certifying supporting checks

| Command | Result | Limitation |
|---|---|---|
| `node_modules/.bin/vite-node scripts/prove-it.mjs` | 4/4 scenarios `PROVEN_LETHAL`; in-process latencies 0, 0, 1, 17 ms; derived p50 0.5 ms / p95 17 ms | Synchronous synthetic simulation, not end-to-end replay |
| `node --experimental-strip-types scripts/sales-judge-audit.mjs` | 4/4 heuristic scenarios certified | Not independent `gpt-5.6-luna` grading |
| `npx vitest run src/lib/liveTranscriptBuffer.test.ts src/lib/sales/inCallNudgeHud.regression.test.ts` | 7/7 passed; HUD reducer p95 0.0016 ms | State/reducer boundary only |
| `node_modules/.bin/tsc --noEmit` | Passed | Does not measure runtime coaching latency |
| `npm run build` | Passed | Does not measure runtime coaching latency |
| `node_modules/.bin/vitest run` | 260/261 tests passed; 1 failed | React test fails because `act` is not a function in `src/components/sales/InCallNudgeHud.test.tsx:61` |

## Unblock action

The holdout owner must mount the protected corpus and provide the timestamped real-time
replay entry point. The evaluator must then rerun at real-time pace, independently grade
relevance/actionability, calculate false interruptions, and replace this unavailable
verdict with a measured PASS or FAIL. No production code was changed for this evaluation.
