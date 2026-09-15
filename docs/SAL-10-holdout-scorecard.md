# SAL-10 Holdout Replay Evaluation Scorecard

**Date:** 2026-09-14  
**Engine revision:** `6d15074` (working tree contains concurrent changes)  
**Evaluator:** Call Replay Evaluator  
**Isolation:** No protected holdout transcript or audio content was copied or disclosed.

## Verdict

**FAIL — holdout certification unavailable.**

The protected Krisp/Weflow/Nexeo corpus and the real-time replay entry point are not
mounted in this workspace. The available repository tests exercise reducers and local
buffer logic only; they do not provide speech-end timestamps, end-to-end transcript
emission timestamps, independent `gpt-5.6-luna` grades, or ground-truth interruption
events. Missing measurements cannot satisfy a quantitative gate.

## SAL-10 acceptance gates

| Gate | Hard threshold | Measured result | Status |
|---|---:|---:|---|
| Dual-channel system audio + rep mic, with echo cancellation preserved | Required | Not measured on a live device or holdout replay | **FAIL / unavailable** |
| Transcript chunk emission cadence | 500 ms | Static implementation adds a 500 ms timestamp chunker; runtime cadence not measured | **FAIL / unavailable** |
| Speech end → transcript emission P95 | < 800 ms | Not measured | **FAIL / unavailable** |
| Audio device disconnect/reconnect | No crash; reconnect required | Static retry/watchdog code present; disconnect replay not measured | **FAIL / unavailable** |

## Level 5 holdout gates

| Metric | Hard threshold | Measured result | Status |
|---|---:|---:|---|
| Prospect completion → coach render P95 | ≤ 2000 ms | Not measured | **FAIL / unavailable** |
| Any single-run latency | ≤ 2500 ms | Not measured | **FAIL / unavailable** |
| Average relevance/actionability | ≥ 4.0 / 5.0 | Not measured; no independent model grading run | **FAIL / unavailable** |
| False-interruption rate | ≤ 5% | Not measured | **FAIL / unavailable** |

## Timestamped holdout excerpts

None available. The protected corpus was not mounted, so no transcript text, utterance
timestamps, objection excerpts, or suggestion content was accessed.

## Non-certifying checks

| Check | Result | Limitation |
|---|---|---|
| `npm test -- --run src/lib/liveTranscriptBuffer.test.ts` | 2/2 tests passed | Frontend buffer state only; no native audio or network timing |
| `cargo test --manifest-path src-tauri/Cargo.toml transcription::common::tests` | Blocked by Cargo 1.69 rejecting lockfile version 4 | Toolchain cannot parse the dependency lockfile |
| `rustup run 1.95.0-aarch64-apple-darwin cargo test --manifest-path src-tauri/Cargo.toml transcription::common::tests -- --nocapture` | Compilation reached link; failed on prebuilt x86_64 `audiopus_sys` objects while linking arm64 | Native test binary did not run |
| Repository search for holdout/replay evaluator instrumentation | No protected corpus or real-time runner found | Synthetic/local checks cannot substitute for holdout evidence |

## Builder handoff diagnostics

- Provide the protected corpus mount and the real-time replay command to the evaluator.
- Capture speech-end and transcript-emission timestamps for every replay segment; report
  aggregate P50/P95/P99 and the maximum observed delay.
- Run the disconnect/reconnect scenario on a real macOS audio device and record whether
  both sources resume without process termination or transcript loss.
- Keep the holdout corpus and verbatim excerpts out of builder-facing comments; only
  share aggregate latency distributions, failure counts, and segment identifiers.

