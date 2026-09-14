# SAL-3 — Spec Writer Contract

## Scope

This contract covers the desktop live-meeting path from the microphone and
macOS system-audio taps through realtime STT events and the frontend live
transcript buffer. Native audio capture and the STT provider remain external
boundaries; the red-bar gate tests the deterministic application boundary.

## Acceptance criteria

- **AC-1 — Dual-source capture:** On macOS, a diarizing meeting attempts one
  microphone capture (`me`) and one system-audio capture (`them`). When both
  are available, the PCM is mixed once into one `mix` STT session. If one
  source cannot start, the available source continues and emits the existing
  warning; if neither starts, the meeting emits a terminal capture error.
- **AC-2 — Timestamp preservation:** Each frontend segment preserves the STT
  event's `id`, `source`, `speaker`, `text`, finality, `start_ms`, and `end_ms`
  values (mapped to `startMs`/`endMs` only). No arrival or wall-clock time may
  replace provider timestamps.
- **AC-3 — Timestamp-aligned order:** Interleaved `me` and `them` events are
  stored by ascending `startMs`, then ascending `endMs` for equal starts,
  regardless of network arrival order.
- **AC-4 — Rolling context:** The buffer retains only segments overlapping the
  inclusive 30,000 ms window ending at the greatest accepted `endMs`. A segment
  whose `endMs` is at or before the lower bound is evicted after each accepted
  update; a late event cannot move the window backwards.
- **AC-5 — Partial replacement:** A partial and its final update reuse one `id`;
  the final replaces the partial without duplication or stale text.
- **AC-6 — Latency/lifecycle:** Buffer insertion adds no timer or network wait;
  production capture-to-frontend delivery remains below 800 ms at p95 under
  the STT harness. Existing one-mic ownership, pause, warning, auth, and stop
  cleanup behavior remains intact.

## Expected interfaces and constraints

- Keep `listenForTranscript()` feeding the real store boundary
  `useStore.getState().upsertSegment(segment)`.
- Keep Rust event fields in snake case and integer milliseconds from meeting
  start; keep `TranscriptSegment` fields in camel case.
- Keep `mix_streams` at 16 kHz mono signed 16-bit PCM and preserve the existing
  capture coordinator. Do not introduce real devices, network calls, clocks,
  or LLM/STT calls into the Vitest gate.

## Builder instructions

1. Implement AC-3 through AC-5 at the live store/buffer boundary while
   preserving replay protection and filler-count accounting.
2. Verify AC-1 and the no-duplicate-sample invariant against
   `src-tauri/src/commands.rs`, `src-tauri/src/audio/mixer.rs`, and
   `src-tauri/src/capture.rs`.
3. Run the gate below before and after implementation:

   ```sh
   npx vitest run src/lib/liveTranscriptBuffer.test.ts
   ```

4. Run the existing frontend suite and relevant Rust tests before QA handoff.

## Red-bar gate

`src/lib/liveTranscriptBuffer.test.ts` drives the real Zustand store with
interleaved rep/prospect events and fixed timestamps. It currently fails for
the intended behavioral reasons: `upsertSegment` uses arrival order and does
not evict segments outside the 30-second window.
