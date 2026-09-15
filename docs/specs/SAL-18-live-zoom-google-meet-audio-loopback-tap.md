# SAL-18 — Live Zoom / Google Meet Audio Loopback Tap

## Scope

This contract covers the desktop meeting path from the existing microphone and
macOS system-audio capture adapters into the live streaming transcription
buffer. It adds a deterministic audio-buffer seam; it does not require a Zoom
or Google Meet SDK, an external bot attendee, or a real audio device in the
automated gate.

The current native adapters remain responsible for producing 16 kHz mono,
signed 16-bit PCM. The new seam is responsible for preserving each source's
capture timestamp, interleaving the two streams, bounding buffering latency,
and terminating cleanly.

## Acceptance criteria

- **AC-1 — Dual-source loopback tap:** A live meeting attempts exactly one
  microphone capture labeled `Microphone` and one system-output loopback capture
  labeled `SystemLoopback` on macOS. The system-output path must capture audio
  played by Zoom, Google Meet, or another meeting client without inviting an AI
  attendee. Both sources feed the same live streaming transcription buffer. If
  one source fails or disconnects, the other source may continue only until the
  tap lifecycle is paused and flushed; the failure must be observable through
  the existing meeting warning/error event path. No source may open a second
  microphone stream.

- **AC-2 — Timestamped chronological interleave:** Every accepted chunk carries
  its source, capture timestamp in monotonic milliseconds from the meeting
  start, and PCM payload. Output is sorted by ascending capture timestamp,
  independent of callback/network arrival order. Equal timestamps use one
  deterministic tie-break (microphone first, then system loopback, then arrival
  sequence). The implementation must not replace capture timestamps with wall
  clock or STT-arrival time.

- **AC-3 — Sub-500 ms delivery bound:** The interleaver may hold a chunk only
  long enough to resolve ordering and must release it at or before 450 ms after
  its capture timestamp in the deterministic harness. `MAX_BUFFER_LATENCY_MS`
  is a public constant less than 500. The normal capture-to-STT-buffer path
  must use the same boundary and must not add a provider request, timer-based
  debounce, or unbounded queue.

- **AC-4 — End/disconnect lifecycle:** Meeting end and either source
  disconnect transition the tap to paused state, synchronously return all
  buffered chunks in chronological order for final STT flush, and release every
  in-memory PCM buffer. After the transition, incoming chunks are ignored and
  no later drain can emit audio from the ended/disconnected meeting. A new
  meeting creates a fresh tap instance/state; old callbacks cannot revive it.

- **AC-5 — Headless fallback harness:** The committed Rust contract tests run
  without CoreAudio, Zoom, Google Meet, network access, or provider credentials.
  The harness must prove reversed callback order, timestamp ordering, the
  sub-500 ms release bound, meeting-end flush, source-disconnect flush, paused
  state, and zero retained PCM. The tests must use fixed timestamps and fixed
  PCM literals, not sleeps or wall-clock assertions.

## Expected interfaces and integration targets

Create a pure Rust module at `src-tauri/src/audio/meeting_tap.rs` with the
following public seam (names and field types are part of the contract):

```rust
pub const MAX_BUFFER_LATENCY_MS: u64 = 450;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AudioSource {
    Microphone,
    SystemLoopback,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AudioChunk {
    pub source: AudioSource,
    pub captured_at_ms: u64,
    pub pcm: Vec<i16>,
}

pub struct MeetingAudioTap { /* private state */ }

impl MeetingAudioTap {
    pub fn new() -> Self;
    pub fn push(&mut self, chunk: AudioChunk);
    pub fn drain_ready(&mut self, now_ms: u64) -> Vec<AudioChunk>;
    pub fn end_meeting(&mut self) -> Vec<AudioChunk>;
    pub fn source_disconnected(&mut self, source: AudioSource) -> Vec<AudioChunk>;
    pub fn is_paused(&self) -> bool;
    pub fn buffered_chunk_count(&self) -> usize;
}
```

The builder must wire `Microphone` and the macOS `SystemAudio` adapter into one
`MeetingAudioTap` before the existing live STT session. The existing 16 kHz
mono PCM contract, `MicCoordinator`, far-end prosody tap, provider
diarization, warning events, and final recording teardown remain in force.
`MeetingAudioTap` must stay free of Tauri, CoreAudio, Tokio, network, provider,
wall-clock, and thread dependencies so the contract test remains headless.

## Red-bar gate

The committed failing test is:

`src-tauri/src/audio/meeting_tap_contract.rs`

Run the compile/test gate with the repository-supported Rust toolchain:

```sh
cargo +1.95.0-aarch64-apple-darwin check --manifest-path src-tauri/Cargo.toml --tests
cargo +1.95.0-aarch64-apple-darwin test --manifest-path src-tauri/Cargo.toml audio::meeting_tap_contract -- --nocapture
```

Before implementation the check must fail because the required
`audio::meeting_tap` module/interface does not exist. The source-level red bar
is deterministic; a full macOS link may additionally require an arm64 Opus
library on the builder host.

## Builder constraints

1. Preserve the existing CoreAudio process-tap permission and warning behavior;
   do not silently substitute microphone-only capture when the loopback tap
   fails without emitting the existing warning/error.
2. Feed both source labels into the same live STT buffer for diarizing
   providers, while retaining existing provider behavior for non-diarizing
   providers. Do not duplicate a source's PCM into multiple billing/recording
   paths.
3. Keep lifecycle ownership explicit: stop/disconnect must close capture gates,
   flush final chunks, and clear the recorder/tap memory exactly once. A late
   callback must be harmless.
4. Do not add real-device setup, sleeps, network calls, or credentials to the
   contract tests. Add platform-specific integration checks separately if
   needed.
5. Run the focused Rust gate after implementation, then the relevant frontend
   and Rust suites before handing off to QA/review.
