pub mod meeting_tap;
pub mod microphone;
pub mod mixer;
pub mod prosody;
pub mod resample;
#[cfg(target_os = "macos")]
pub mod system_macos;

#[cfg(test)]
mod meeting_tap_contract;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::thread::JoinHandle;
use std::time::Instant;
use tokio::sync::mpsc::UnboundedSender;

/// Target sample rate for everything we hand to Soniox (mono, s16le).
pub const TARGET_SAMPLE_RATE: u32 = 16_000;

/// A capture callback's PCM plus its monotonic arrival timestamp. The meeting
/// tap converts the timestamp to milliseconds from that meeting's start.
pub struct CapturedAudio {
    pub pcm: Vec<i16>,
    pub captured_at: Instant,
}

/// A capture backend that produces 16 kHz mono `i16` PCM on `tx` until `running`
/// is cleared. Implemented by [`microphone::Microphone`] today; the macOS Core
/// Audio system tap lands in M2, with ScreenCaptureKit and Windows WASAPI behind
/// the same trait afterwards.
pub trait AudioSource {
    /// Start capturing on a dedicated thread, returning its join handle. The
    /// thread runs until `running` becomes `false`, then releases the device.
    fn start(
        &self,
        tx: UnboundedSender<Vec<i16>>,
        running: Arc<AtomicBool>,
    ) -> anyhow::Result<JoinHandle<()>>;

    /// Start a capture with monotonic timestamps for the live meeting tap.
    /// The legacy raw-P​​CM seam remains available for mic tests and providers
    /// that intentionally use separate source sessions.
    fn start_timestamped(
        &self,
        tx: tokio::sync::mpsc::UnboundedSender<CapturedAudio>,
        running: Arc<AtomicBool>,
    ) -> anyhow::Result<JoinHandle<()>> {
        let (raw_tx, mut raw_rx) = tokio::sync::mpsc::unbounded_channel();
        let capture = self.start(raw_tx, running.clone())?;
        Ok(std::thread::spawn(move || {
            while let Some(pcm) = raw_rx.blocking_recv() {
                if tx
                    .send(CapturedAudio {
                        pcm,
                        captured_at: Instant::now(),
                    })
                    .is_err()
                {
                    running.store(false, std::sync::atomic::Ordering::SeqCst);
                    break;
                }
            }
            let _ = capture.join();
        }))
    }
}
