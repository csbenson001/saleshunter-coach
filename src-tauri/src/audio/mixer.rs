//! Real-time mixer that sums two 16 kHz mono PCM streams (mic + system audio)
//! into one, so a single transcription session can bill 1x instead of 2x.
//! Speaker separation then comes from the provider's diarization rather than
//! from which capture device the audio arrived on.

use std::collections::VecDeque;
use std::time::{Duration, Instant};

use tauri::AppHandle;
use tokio::sync::mpsc::{UnboundedReceiver, UnboundedSender};

use super::TARGET_SAMPLE_RATE;
use crate::transcription::common::{LevelMeter, LEVEL_EVENT};

/// Drop the oldest samples once a side backs up beyond this (the other side
/// stalled). Bounds memory and keeps the two streams roughly time-aligned.
const MAX_BACKLOG: usize = TARGET_SAMPLE_RATE as usize * 2; // 2 seconds

/// A side that is open but hasn't delivered for this long is treated as stalled
/// and stops gating the other side. Critical failure mode: the system-audio tap
/// "starts" without the System Audio Recording permission but never produces a
/// frame — min-prefix mixing alone would then dam the MIC too, and the whole
/// meeting transcribes nothing.
const STALL: Duration = Duration::from_millis(600);

/// Minimum normalized correlation before the mic signal is treated as speaker
/// bleed.  A direct near-end voice signal is not correlated with the clean
/// system-output reference, while an acoustic echo is.
const ECHO_CORRELATION_FLOOR: f32 = 0.35;
const MAX_ECHO_LAG_SAMPLES: usize = 1600; // 100 ms at 16 kHz
const MIN_ECHO_WINDOW_SAMPLES: usize = 256;

/// Remove the component of `mic` explained by the clean far-end reference.
/// This is a single-frame normalized least-squares echo canceller: it estimates
/// the acoustic gain from the reference to the mic, then subtracts only that
/// correlated component.  Uncorrelated near-end speech remains in the stream.
///
/// The mixer is deliberately the STT boundary for this operation. Prosody's
/// far-end detector is a coaching aid and cannot protect the transcript; every
/// diarized mixed session must pass through this function first.
#[cfg_attr(not(test), allow(dead_code))]
fn remove_correlated_echo(mic: &[f32], far: &[f32]) -> Vec<f32> {
    remove_correlated_echo_with_reference(mic, far, 0)
}

/// Stateful reference history lets the canceller remove an echo that crosses
/// an input-chunk boundary instead of resetting its delay search every 20 ms.
#[derive(Default)]
struct EchoCanceller {
    far_history: VecDeque<f32>,
}

impl EchoCanceller {
    fn mix_chunk(&mut self, mic: &[f32], far: &[f32]) -> Vec<f32> {
        let history_len = self.far_history.len();
        let mut reference: Vec<f32> = self.far_history.iter().copied().collect();
        reference.extend(far.iter().copied());
        let clean_mic = remove_correlated_echo_with_reference(mic, &reference, history_len);
        self.far_history.extend(far.iter().copied());
        while self.far_history.len() > MAX_ECHO_LAG_SAMPLES + 1 {
            self.far_history.pop_front();
        }
        let n = mic.len().min(far.len());
        (0..n).map(|i| clean_mic[i] + far[i]).collect()
    }
}

fn remove_correlated_echo_with_reference(
    mic: &[f32],
    far: &[f32],
    current_start: usize,
) -> Vec<f32> {
    let n = mic.len();
    if n == 0 || far.is_empty() {
        return mic.to_vec();
    }

    let max_lag = MAX_ECHO_LAG_SAMPLES;
    let mut best: Option<(usize, f32, f32, f32)> = None;
    for lag in 0..=max_lag {
        let mic_start = lag.saturating_sub(current_start);
        let far_start = current_start.saturating_sub(lag);
        if mic_start >= n || far_start >= far.len() {
            continue;
        }
        let window_len = (n - mic_start).min(far.len() - far_start);
        if window_len < MIN_ECHO_WINDOW_SAMPLES {
            continue;
        }
        let mic_window = &mic[mic_start..mic_start + window_len];
        let far_window = &far[far_start..far_start + window_len];
        let mic_energy = mic_window
            .iter()
            .map(|sample| sample * sample)
            .sum::<f32>();
        let far_energy = far_window
            .iter()
            .map(|sample| sample * sample)
            .sum::<f32>();
        if mic_energy <= f32::EPSILON || far_energy <= f32::EPSILON {
            continue;
        }
        let covariance = mic_window
            .iter()
            .zip(far_window.iter())
            .map(|(mic_sample, far_sample)| mic_sample * far_sample)
            .sum::<f32>();
        let correlation = covariance.abs() / (mic_energy * far_energy).sqrt();
        if best
            .as_ref()
            .is_none_or(|(_, _, _, best_correlation)| correlation > *best_correlation)
        {
            best = Some((lag, covariance, far_energy, correlation));
        }
    }

    let Some((lag, covariance, far_energy, correlation)) = best else {
        return mic.to_vec();
    };
    if correlation < ECHO_CORRELATION_FLOOR {
        return mic.to_vec();
    }

    let gain = covariance / far_energy;
    mic.iter()
        .enumerate()
        .map(|(i, sample)| {
            let mic_start = lag.saturating_sub(current_start);
            let far_start = current_start.saturating_sub(lag);
            let far_index = far_start + i.saturating_sub(mic_start);
            if i >= mic_start && far_index < far.len() {
                sample - gain * far[far_index]
            } else {
                *sample
            }
        })
        .collect()
}

/// Mix one aligned mic/system frame after suppressing the mic's correlated
/// speaker echo. Kept separate from the async channel loop for deterministic
/// audio tests and to make the STT boundary explicit.
#[cfg_attr(not(test), allow(dead_code))]
fn mix_chunk(mic: &[f32], far: &[f32]) -> Vec<f32> {
    EchoCanceller::default().mix_chunk(mic, far)
}

/// Sum `rx_a` and `rx_b` sample-by-sample into `tx_out` until both close.
/// Mixes where both sides have data; a side that ends (or stalls — see [STALL])
/// stops gating the other, whose audio then passes through untouched. The mixed
/// OUTPUT is metered and emitted as the "me" input level, so the header meter
/// reflects everything being captured (mic + system) rather than the mic alone
/// — otherwise system audio playing with no mic input would leave the meter
/// flat even though it is being recorded and transcribed.
pub async fn mix_streams(
    app: AppHandle,
    mut rx_a: UnboundedReceiver<Vec<i16>>,
    mut rx_b: UnboundedReceiver<Vec<i16>>,
    tx_out: UnboundedSender<Vec<i16>>,
) {
    let mut meter = LevelMeter::new(app, "me", LEVEL_EVENT);
    let mut a: VecDeque<i16> = VecDeque::new();
    let mut b: VecDeque<i16> = VecDeque::new();
    let mut a_open = true;
    let mut b_open = true;
    let mut last_a = Instant::now();
    let mut last_b = Instant::now();
    let mut echo_canceller = EchoCanceller::default();
    // Wakes the loop so a stall is detected even when the stalled side never
    // delivers another chunk (recv alone would park us until the OTHER side's
    // next chunk, which is fine while it flows — the tick covers full silence).
    let mut tick = tokio::time::interval(Duration::from_millis(200));
    tick.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

    // Meter then forward one output chunk. Every send routes through here so the
    // "me" level reflects the exact mixed audio and no emit path is missed.
    // Returns `false` once the consumer is gone, so the caller can stop.
    let mut emit = |out: Vec<i16>| -> bool {
        meter.push(&out);
        tx_out.send(out).is_ok()
    };

    while a_open || b_open {
        tokio::select! {
            chunk = rx_a.recv(), if a_open => match chunk {
                Some(c) => {
                    a.extend(c);
                    last_a = Instant::now();
                }
                None => a_open = false,
            },
            chunk = rx_b.recv(), if b_open => match chunk {
                Some(c) => {
                    b.extend(c);
                    last_b = Instant::now();
                }
                None => b_open = false,
            },
            _ = tick.tick() => {}
        }

        // Mix the overlapping prefix of both buffers.
        let n = a.len().min(b.len());
        if n > 0 {
            let mic: Vec<f32> = a
                .iter()
                .take(n)
                .map(|sample| *sample as f32 / i16::MAX as f32)
                .collect();
            let far: Vec<f32> = b
                .iter()
                .take(n)
                .map(|sample| *sample as f32 / i16::MAX as f32)
                .collect();
            let mixed = echo_canceller.mix_chunk(&mic, &far);
            let mut out = Vec::with_capacity(n);
            for _ in 0..n {
                a.pop_front();
                b.pop_front();
            }
            for sample in mixed {
                out.push((sample * i16::MAX as f32)
                    .round()
                    .clamp(i16::MIN as f32, i16::MAX as f32) as i16);
            }
            if !emit(out) {
                return;
            }
        }

        // Stall guard: an open-but-silent side must not dam the flowing one.
        // Pass the flowing side straight through; when the stalled side wakes,
        // min-prefix mixing resumes (the streams re-align within MAX_BACKLOG).
        if a_open && b_open {
            if !a.is_empty() && b.is_empty() && last_b.elapsed() >= STALL {
                let out: Vec<i16> = a.drain(..).collect();
                if !emit(out) {
                    return;
                }
            } else if !b.is_empty() && a.is_empty() && last_a.elapsed() >= STALL {
                let out: Vec<i16> = b.drain(..).collect();
                if !emit(out) {
                    return;
                }
            }
        }

        // When one side has permanently ended, flush the other directly.
        if !a_open && !b.is_empty() {
            let out: Vec<i16> = b.drain(..).collect();
            if !emit(out) {
                return;
            }
        }
        if !b_open && !a.is_empty() {
            let out: Vec<i16> = a.drain(..).collect();
            if !emit(out) {
                return;
            }
        }

        // Drift guard: only trim a side that is still producing. A closed
        // side's residual is real captured audio — leave it for the flush
        // above rather than dropping it.
        if a_open && a.len() > MAX_BACKLOG {
            a.drain(..a.len() - MAX_BACKLOG);
        }
        if b_open && b.len() > MAX_BACKLOG {
            b.drain(..b.len() - MAX_BACKLOG);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{mix_chunk, remove_correlated_echo};

    fn tone(period: usize, length: usize) -> Vec<f32> {
        (0..length)
            .map(|i| ((i % period) as f32 / period as f32 * std::f32::consts::TAU).sin())
            .collect()
    }

    #[test]
    fn removes_correlated_speaker_echo_before_stt_mix() {
        let far = tone(37, 4096);
        let mic: Vec<f32> = far.iter().map(|sample| sample * 0.45).collect();

        let clean_mic = remove_correlated_echo(&mic, &far);
        let mixed = mix_chunk(&clean_mic, &far);

        let residual = clean_mic.iter().map(|sample| sample.abs()).sum::<f32>() / mic.len() as f32;
        assert!(residual < 0.01, "speaker bleed remained in mic path: {residual}");
        for (actual, expected) in mixed.iter().zip(far.iter()) {
            assert!((actual - expected).abs() < 0.01, "mixed STT sample retained echo");
        }
    }

    #[test]
    fn preserves_uncorrelated_near_end_speech_while_removing_echo() {
        let far = tone(37, 4096);
        let near = tone(53, far.len());
        let mic: Vec<f32> = near
            .iter()
            .zip(far.iter())
            .map(|(speech, echo)| speech * 0.7 + echo * 0.45)
            .collect();

        let clean_mic = remove_correlated_echo(&mic, &far);
        let correlation_with_near = clean_mic
            .iter()
            .zip(near.iter())
            .map(|(actual, expected)| actual * expected)
            .sum::<f32>();
        let near_energy = near.iter().map(|sample| sample * sample).sum::<f32>();

        assert!(correlation_with_near / near_energy > 0.55, "near-end speech was suppressed");
    }

    #[test]
    fn removes_a_short_acoustic_delay_from_speaker_echo() {
        let far = tone(37, 4096);
        let delay = 160;
        let mut mic = vec![0.0; far.len()];
        for i in delay..far.len() {
            mic[i] = far[i - delay] * 0.45;
        }

        let clean_mic = remove_correlated_echo(&mic, &far);
        let residual = clean_mic[delay..]
            .iter()
            .map(|sample| sample.abs())
            .sum::<f32>()
            / (far.len() - delay) as f32;
        assert!(residual < 0.03, "delayed speaker bleed remained in mic path: {residual}");
    }

    #[test]
    fn de_echo_mix_stays_under_800ms_p95_for_live_chunks() {
        let far = tone(37, 320); // 20 ms at the 16 kHz target rate
        let mic: Vec<f32> = far.iter().map(|sample| sample * 0.45).collect();
        let mut durations_ms = Vec::with_capacity(100);
        for _ in 0..100 {
            let started = std::time::Instant::now();
            let _ = mix_chunk(&mic, &far);
            durations_ms.push(started.elapsed().as_secs_f64() * 1_000.0);
        }
        durations_ms.sort_by(f64::total_cmp);
        assert!(durations_ms[94] < 800.0, "de-echo p95 exceeded 800 ms");
    }
}
