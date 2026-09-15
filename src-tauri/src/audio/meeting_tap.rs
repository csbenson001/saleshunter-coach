//! Timestamped interleaving for the live meeting's microphone and loopback.
//!
//! Capture adapters run independently and may deliver callbacks out of order.
//! This module is deliberately platform- and runtime-agnostic: adapters hand
//! it already-normalized PCM, and the meeting pipeline drains the resulting
//! chronological stream into its single STT input.

/// Maximum amount of time a chunk may wait for an earlier callback before it
/// becomes eligible for delivery.  This leaves headroom below the product's
/// 500 ms capture-to-buffer ceiling.
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

#[derive(Clone, Debug)]
struct BufferedChunk {
    chunk: AudioChunk,
    arrival_sequence: u64,
}

/// Interleaves the two live meeting sources until the meeting terminates.
///
/// The tap owns accepted PCM only until it is drained or flushed. Once a
/// meeting ends or either source disconnects, it is permanently paused so late
/// callbacks from the old capture session cannot revive it.
pub struct MeetingAudioTap {
    buffered: Vec<BufferedChunk>,
    next_arrival_sequence: u64,
    paused: bool,
}

impl MeetingAudioTap {
    pub fn new() -> Self {
        Self {
            buffered: Vec::new(),
            next_arrival_sequence: 0,
            paused: false,
        }
    }

    /// Accept a capture callback while this meeting is live.
    pub fn push(&mut self, chunk: AudioChunk) {
        if self.paused {
            return;
        }

        let arrival_sequence = self.next_arrival_sequence;
        self.next_arrival_sequence = self.next_arrival_sequence.wrapping_add(1);
        self.buffered.push(BufferedChunk {
            chunk,
            arrival_sequence,
        });
    }

    /// Return chunks old enough to be ordered without exceeding the latency
    /// bound. Chunks with equal timestamps use microphone-first ordering and
    /// then their independent callback arrival order.
    pub fn drain_ready(&mut self, now_ms: u64) -> Vec<AudioChunk> {
        if self.paused {
            return Vec::new();
        }

        let cutoff = now_ms.saturating_sub(MAX_BUFFER_LATENCY_MS);
        self.drain_where(|entry| entry.chunk.captured_at_ms <= cutoff)
    }

    /// End the meeting and synchronously flush every pending chunk. The tap is
    /// paused before extracting data, making callbacks racing with teardown
    /// harmless once they reach this object.
    pub fn end_meeting(&mut self) -> Vec<AudioChunk> {
        self.pause_and_flush()
    }

    /// A source disconnect terminates this tap as a unit. The source argument
    /// is retained in the public seam so callers can report which adapter
    /// failed while the tap guarantees no other buffered source is retained.
    pub fn source_disconnected(&mut self, _source: AudioSource) -> Vec<AudioChunk> {
        self.pause_and_flush()
    }

    pub fn is_paused(&self) -> bool {
        self.paused
    }

    pub fn buffered_chunk_count(&self) -> usize {
        self.buffered.len()
    }

    fn pause_and_flush(&mut self) -> Vec<AudioChunk> {
        self.paused = true;
        self.drain_where(|_| true)
    }

    fn drain_where(&mut self, mut ready: impl FnMut(&BufferedChunk) -> bool) -> Vec<AudioChunk> {
        let mut ready_chunks = Vec::new();
        let mut pending = Vec::with_capacity(self.buffered.len());

        for entry in self.buffered.drain(..) {
            if ready(&entry) {
                ready_chunks.push(entry);
            } else {
                pending.push(entry);
            }
        }
        self.buffered = pending;

        ready_chunks.sort_by_key(|entry| {
            (
                entry.chunk.captured_at_ms,
                source_order(entry.chunk.source),
                entry.arrival_sequence,
            )
        });
        ready_chunks.into_iter().map(|entry| entry.chunk).collect()
    }
}

impl Default for MeetingAudioTap {
    fn default() -> Self {
        Self::new()
    }
}

fn source_order(source: AudioSource) -> u8 {
    match source {
        AudioSource::Microphone => 0,
        AudioSource::SystemLoopback => 1,
    }
}
