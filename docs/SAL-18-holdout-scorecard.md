# SAL-18 Holdout Replay Evaluation Scorecard

**Date:** 2026-09-14  
**Engine revision:** `f4135d6`  
**Evaluator:** Call Replay Evaluator  
**Isolation:** The protected Krisp/Weflow/Nexeo corpus was not mounted. No protected transcript or audio content was accessed or copied.

## Verdict

**FAIL — Level 5 holdout certification unavailable.**

The repository contains only a synthetic smoke fixture. The available replay runner measures the local deterministic objection/concession reducer, not the live audio → STT → LLM → HUD path. Missing holdout measurements cannot satisfy the binary quality gate.

## Required holdout gates

| Metric | Hard threshold | Measured result | Status |
|---|---:|---:|---|
| Prospect utterance end → coach render P95 | ≤ 2,000 ms | Not measured | **FAIL / unavailable** |
| Any single-run latency | ≤ 2,500 ms | Not measured | **FAIL / unavailable** |
| Average relevance/actionability | ≥ 4.0 / 5.0 | Not measured; no independent `gpt-5.6-luna` grading run | **FAIL / unavailable** |
| False-interruption rate | ≤ 5% | Not measured; no ground-truth interruption labels | **FAIL / unavailable** |

## Available non-certifying checks

| Check | Result | Limitation |
|---|---:|---|
| Deterministic smoke replay | PASS; 1 file, 3 utterances, 2 cues | Synthetic fixture only; not a holdout or end-to-end run |
| Smoke latency | P50 0.78 ms; P95 1.26 ms; P99 1.30 ms; max 1.31 ms | Local reducer/render seam only |
| Focused frontend tests | PASS; 13/13 tests | No native capture, provider timing, or independent grading |
| Native `meeting_tap_contract` test | Did not execute | Modern Cargo reached link, then failed on x86_64 Opus objects required by arm64 |
| Default Cargo invocation | Did not execute | Host Cargo 1.69 rejects lockfile version 4 |

## Timestamped excerpts

None. The protected corpus was unavailable, so no transcript text, utterance timestamps, or suggestion text is included.

## Builder handoff diagnostics

- Mount the protected holdout corpus and provide the evaluator-only real-time replay entry point.
- Capture prospect speech-end and coach-render timestamps for every triggered turn; report aggregate P50/P95/P99 and maximum latency.
- Supply independent relevance/actionability grades and ground-truth nudge-needed labels so false interruptions can be calculated.
- Rebuild the native Opus dependency for arm64, then execute the headless tap contract and a real macOS loopback/microphone disconnect run.

**Recommendation:** Do not certify SAL-18 or approve ticket completion until the missing holdout and hardware measurements are available.
