//! Red-bar contract tests for the live meeting audio tap.
//!
//! The production module is intentionally not present yet. These tests define
//! the pure, headless seam that the microphone and system-loopback adapters
//! must feed before their chunks enter the live STT buffer.

use super::meeting_tap::{AudioChunk, AudioSource, MeetingAudioTap, MAX_BUFFER_LATENCY_MS};

fn chunk(source: AudioSource, captured_at_ms: u64, sample: i16) -> AudioChunk {
    AudioChunk {
        source,
        captured_at_ms,
        pcm: vec![sample, sample + 1],
    }
}

#[test]
fn headless_harness_interleaves_mic_and_loopback_by_capture_time() {
    let mut tap = MeetingAudioTap::new();

    // Delivery order is intentionally reversed to model independent CoreAudio
    // callbacks arriving on separate threads.
    tap.push(chunk(AudioSource::SystemLoopback, 1_200, 20));
    tap.push(chunk(AudioSource::Microphone, 1_100, 10));

    let ready = tap.drain_ready(1_200 + MAX_BUFFER_LATENCY_MS);

    assert_eq!(
        ready,
        vec![
            chunk(AudioSource::Microphone, 1_100, 10),
            chunk(AudioSource::SystemLoopback, 1_200, 20),
        ]
    );
}

#[test]
fn headless_harness_releases_chunks_before_the_500ms_latency_ceiling() {
    let mut tap = MeetingAudioTap::new();
    tap.push(chunk(AudioSource::Microphone, 5_000, 10));

    assert_eq!(MAX_BUFFER_LATENCY_MS, 450);
    assert!(tap
        .drain_ready(5_000 + MAX_BUFFER_LATENCY_MS - 1)
        .is_empty());
    assert_eq!(
        tap.drain_ready(5_000 + MAX_BUFFER_LATENCY_MS),
        vec![chunk(AudioSource::Microphone, 5_000, 10)]
    );
    assert!(MAX_BUFFER_LATENCY_MS < 500);
}

#[test]
fn meeting_end_pauses_and_flushes_all_buffered_audio() {
    let mut tap = MeetingAudioTap::new();
    tap.push(chunk(AudioSource::Microphone, 7_000, 10));
    tap.push(chunk(AudioSource::SystemLoopback, 7_010, 20));

    let flushed = tap.end_meeting();

    assert_eq!(
        flushed,
        vec![
            chunk(AudioSource::Microphone, 7_000, 10),
            chunk(AudioSource::SystemLoopback, 7_010, 20),
        ]
    );
    assert!(tap.is_paused());
    assert_eq!(tap.buffered_chunk_count(), 0);
    tap.push(chunk(AudioSource::Microphone, 7_020, 30));
    assert!(tap.drain_ready(8_000).is_empty());
}

#[test]
fn source_disconnect_pauses_and_flushes_without_retaining_pcm() {
    let mut tap = MeetingAudioTap::new();
    tap.push(chunk(AudioSource::SystemLoopback, 9_000, 20));

    let flushed = tap.source_disconnected(AudioSource::SystemLoopback);

    assert_eq!(flushed, vec![chunk(AudioSource::SystemLoopback, 9_000, 20)]);
    assert!(tap.is_paused());
    assert_eq!(tap.buffered_chunk_count(), 0);
}
