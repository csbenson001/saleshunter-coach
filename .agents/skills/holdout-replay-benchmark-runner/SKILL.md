---
name: holdout-replay-benchmark-runner
description: Replay golden sales call transcripts through the live coaching pipeline to verify latency (<3s), cue precision, and zero regression against baseline datasets.
---

# Deterministic Audio Stream Replay Benchmark Runner

## 1. Problem Context & Business Goal
Without deterministic replay benchmarks, updates to LLM prompts or regex patterns can silently degrade cue latency or cause regression. The replay benchmark simulates real-time audio chunk feeds and measures response time and cue accuracy.

## 2. Proven Architecture & Implementation Pattern
- Golden call dataset loader in `src/lib/replay/replayRunner.ts`.
- Chunk-by-chunk streaming emitter mimicking live microphone input.
- Metric collection: TTFC (Time To First Cue), precision, recall, and glanceability rule violations.

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
- Use fake timers or high-precision performance counters to prevent flaky CI test execution.

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm vitest run src/lib/replay/__tests__/replayRunner.test.ts && npx tsc --noEmit
```
