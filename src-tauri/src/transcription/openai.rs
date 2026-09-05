//! OpenAI Realtime transcription adapter. Opens a realtime session in
//! transcription intent, streams base64 pcm16 audio, and assembles the
//! delta/completed transcription events into segments.
//!
//! Note: the realtime transcription API does not diarize, so every segment is
//! emitted under speaker 0.

use anyhow::{anyhow, Result};
use base64::Engine;
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::json;
use tauri::AppHandle;
use tokio::sync::mpsc::UnboundedReceiver;
use tokio_tungstenite::tungstenite::Message;

use super::common::{
    connect_with_headers, drive_session, LevelMeter, SegmentBuilder, TranscribeConfig, LEVEL_EVENT,
    TRANSCRIPT_EVENT,
};
use crate::audio::resample::{pcm_to_le_bytes, LinearResampler};
use crate::audio::TARGET_SAMPLE_RATE;

const OPENAI_RT_URL: &str = "wss://api.openai.com/v1/realtime?intent=transcription";
const DEFAULT_MODEL: &str = "gpt-4o-transcribe";
/// OpenAI's GA realtime API refuses anything below 24 kHz, but the whole capture
/// pipeline (recording, prosody, replay) is built on 16 kHz. Rather than move
/// TARGET_SAMPLE_RATE and disturb all of that, this provider upsamples its own
/// leg on the way out. Nothing else in the app sees 24 kHz.
const OPENAI_RATE_HZ: u32 = 24_000;

#[derive(Deserialize, Default)]
struct OaiError {
    #[serde(default)]
    message: String,
}

#[derive(Deserialize, Default)]
struct OaiEvent {
    #[serde(rename = "type", default)]
    event_type: String,
    #[serde(default)]
    delta: String,
    #[serde(default)]
    transcript: String,
    /// Present on `error` events — the session-level failure detail.
    #[serde(default)]
    error: Option<OaiError>,
}

pub async fn run_session(
    app: AppHandle,
    config: TranscribeConfig,
    source: &'static str,
    mut pcm_rx: UnboundedReceiver<Vec<i16>>,
) -> Result<()> {
    let ws = connect_with_headers(
        OPENAI_RT_URL,
        &[("Authorization", format!("Bearer {}", config.api_key))],
    )
    .await?;
    let (mut write, mut read) = ws.split();

    let model = if config.model.trim().is_empty() {
        DEFAULT_MODEL
    } else {
        config.model.as_str()
    };
    let mut transcription = json!({ "model": model });
    if let Some(lang) = config.language_hints.first() {
        transcription["language"] = json!(lang);
    }
    // GA shape. The beta `transcription_session.update` was retired along with
    // the `OpenAI-Beta: realtime=v1` header; the server rejects both outright.
    let setup = json!({
        "type": "session.update",
        "session": {
            "type": "transcription",
            "audio": {
                "input": {
                    "format": { "type": "audio/pcm", "rate": OPENAI_RATE_HZ },
                    "transcription": transcription,
                    "turn_detection": { "type": "server_vad", "silence_duration_ms": 500 }
                }
            }
        }
    });
    write.send(Message::Text(setup.to_string())).await?;
    eprintln!("[openai:{source}] connected, model={model} (diarization unsupported → speaker 0)");

    let mut meter = LevelMeter::new(app.clone(), source, LEVEL_EVENT);
    // Resolves with whether the input drained (normal stop) or a send failed
    // (dead socket) — drive_session reports the latter as a failure.
    let forward = async move {
        let b64 = base64::engine::general_purpose::STANDARD;
        let mut upsampler = LinearResampler::new(TARGET_SAMPLE_RATE, OPENAI_RATE_HZ);
        let mut as_f32: Vec<f32> = Vec::new();
        let mut upsampled: Vec<i16> = Vec::new();
        let drained = loop {
            let Some(chunk) = pcm_rx.recv().await else {
                break true;
            };
            // Meter the original 16 kHz chunk — levels feed prosody, which is
            // 16 kHz everywhere. Only the bytes on the wire are resampled.
            meter.push(&chunk);
            as_f32.clear();
            as_f32.extend(chunk.iter().map(|&s| s as f32 / 32768.0));
            upsampled.clear();
            upsampler.process(&as_f32, &mut upsampled);
            let bytes = pcm_to_le_bytes(&upsampled);
            let audio = b64.encode(&bytes);
            let msg = json!({ "type": "input_audio_buffer.append", "audio": audio });
            if write.send(Message::Text(msg.to_string())).await.is_err() {
                break false;
            }
        };
        let _ = write.close().await;
        drained
    };

    let read_loop = async move {
        let mut builder = SegmentBuilder::new(app.clone(), source, TRANSCRIPT_EVENT);
        let mut interim = String::new();
        let mut msg_count: u64 = 0;
        let mut result: Result<()> = Ok(());
        while let Some(msg) = read.next().await {
            let payload = match msg {
                Ok(Message::Text(t)) => t.to_string(),
                Ok(Message::Binary(b)) => String::from_utf8_lossy(&b).into_owned(),
                Ok(Message::Close(frame)) => {
                    eprintln!("[openai:{source}] closed by server: {frame:?}");
                    break;
                }
                Ok(_) => continue,
                Err(e) => {
                    eprintln!("[openai:{source}] read error: {e}");
                    break;
                }
            };
            msg_count += 1;
            if msg_count <= 3 {
                eprintln!("[openai:{source}] RX raw#{msg_count}: {payload}");
            }
            let ev: OaiEvent = match serde_json::from_str(&payload) {
                Ok(e) => e,
                Err(_) => continue,
            };
            match ev.event_type.as_str() {
                "conversation.item.input_audio_transcription.delta" => {
                    interim.push_str(&ev.delta);
                    builder.emit_tail(&interim, 0, 0);
                }
                "conversation.item.input_audio_transcription.completed" => {
                    let text = if ev.transcript.is_empty() {
                        interim.clone()
                    } else {
                        ev.transcript
                    };
                    if !text.trim().is_empty() {
                        builder.push_final(text.trim(), 0, 0, 0);
                        builder.emit_committed();
                        builder.endpoint();
                    }
                    interim.clear();
                    builder.emit_tail("", 0, 0); // clear the tail
                }
                "error" => {
                    // A session-level error event is terminal — the server
                    // stops transcribing after it. Surface it (see
                    // run_metered_session) instead of logging into the void.
                    eprintln!("[openai:{source}] error event: {payload}");
                    let detail = ev
                        .error
                        .map(|e| e.message)
                        .filter(|m| !m.is_empty())
                        .unwrap_or_else(|| "server error".to_string());
                    result = Err(anyhow!("{detail}"));
                    break;
                }
                _ => {}
            }
        }
        result
    };

    drive_session("openai", forward, read_loop).await
}
