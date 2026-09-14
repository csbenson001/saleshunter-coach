# SAL-3 — Live Transcript Tap & Streaming Buffer

## Contract

The live meeting pipeline must combine the microphone and system-audio tap into
the existing realtime transcription path and expose a timestamped, bounded
transcript buffer to the coach UI.

### Acceptance criteria

- **AC-1 — Dual-source capture:** A meeting attempts one microphone source and one
  system-audio source. A provider with diarization receives one mixed stream so
  speakers can be separated without duplicating audio. A provider without
  diarization keeps deterministic `me` and `them` streams. System audio must
  never be looped back into the microphone source; if the system tap is
  unavailable, the meeting continues mic-only and emits the existing
  `meeting://warning` signal.
- **AC-2 — Timestamped event contract:** Every live transcript update reaches the
  frontend as `{ id, source, speaker, text, is_final, start_ms, end_ms }`.
  `start_ms` and `end_ms` are non-negative meeting-relative milliseconds, and a
  segment must satisfy `end_ms >= start_ms`. A partial update and its final
  update reuse the same `id`; the buffer replaces the prior value instead of
  duplicating it.
- **AC-3 — Capture-time ordering:** Interleaved events from microphone and
  system audio are ordered by `startMs`, then `endMs`, regardless of which
  source's event arrived first. The provider's timestamp boundaries are
  preserved; arrival time is never used as the transcript clock.
- **AC-4 — Rolling context:** The live buffer retains only segments with a
  positive-duration overlap with the latest 30,000 ms window ending at the
  greatest accepted `endMs` (`segment.endMs > newestEndMs - 30_000`). Older
  segments are evicted after each accepted update. A segment that started before
  the boundary is retained when its end is still inside the window.
- **AC-5 — Latency and lifecycle:** The normal capture-to-event path is bounded
  to less than 800 ms under the fixture stream, does not open a second meeting
  capture when `start_meeting` is called twice, and closes all source/session
  handles on stop. The implementation must preserve existing provider auth,
  pause, usage, and warning behavior.
- **AC-6 — Automated gate:**
  [`liveTranscriptBuffer.test.ts`](../../src/lib/liveTranscriptBuffer.test.ts)
  must pass. It is the pre-builder red gate and covers timestamp ordering,
  partial replacement, and 30-second eviction.

## Execution instructions for Builder

1. Start with the failing test:

   ```sh
   bunx vitest run src/lib/liveTranscriptBuffer.test.ts
   ```

   The committed baseline must fail on the buffer assertions, not on test
   discovery, imports, TypeScript syntax, or environment setup.
2. Implement the smallest production change at the existing boundary:
   `useStore.upsertSegment` in `src/lib/store.ts` must replace by `id`, retain
   provider timestamps, sort by `(startMs, endMs)`, and evict segments outside
   the rolling window. Keep replay/study behavior unchanged.
3. Verify the native side in `src-tauri/src/commands.rs`,
   `src-tauri/src/capture.rs`, `src-tauri/src/audio/mixer.rs`, and
   `src-tauri/src/transcription/common.rs`. Do not add a second capture
   coordinator or a second recording/STT pipeline.
4. Run the focused test again, then the repository-required TypeScript and
   Vitest checks before handoff. Native changes should include focused
   `cargo test` coverage for any new Rust helper.

## Out of scope

Provider billing changes, prompt changes, saved-replay trimming, speaker
renaming, and UI redesign are not part of SAL-3.
