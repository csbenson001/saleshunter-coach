import type { TranscriptSegment } from "../types";
import {
  detectConcessionDemands,
  type ConcessionDemand,
} from "./concessionMatrix";

/** Keep the local cue well inside the end-to-end 1.8 second coaching SLA. */
export const SOUNDBOARD_START_BUDGET_MS = 250;
const CUE_LOOKBACK_SEGMENTS = 5;

export interface LiveConcessionCue {
  key: string;
  concession: ConcessionDemand;
}

/**
 * Find the newest transcript segment that independently contains a concession.
 * Returning the matching segment id keeps the cue stable while later, unrelated
 * transcript updates arrive, but allows a repeated objection later in the call
 * to alert the rep again.
 */
export function findLiveConcessionCue(
  segments: readonly TranscriptSegment[],
): LiveConcessionCue | null {
  const first = Math.max(0, segments.length - CUE_LOOKBACK_SEGMENTS);
  for (let i = segments.length - 1; i >= first; i -= 1) {
    const segment = segments[i];
    if (!segment.text.trim()) continue;
    const detection = detectConcessionDemands(segment.text);
    if (detection.detected && detection.concession) {
      return {
        key: `${segment.id}:${detection.concession.id}`,
        concession: detection.concession,
      };
    }
  }
  return null;
}

export interface SoundboardCueReceipt {
  startupLatencyMs: number;
  withinBudget: boolean;
}

let audioContext: AudioContext | null = null;

/**
 * Play a short, speech-safe two-note alert through the rep's local output.
 * Reusing an interactive-latency AudioContext avoids paying device startup on
 * every transcript update. The cue contains no spoken content, so a failed or
 * unavailable audio device never blocks the visual counterpunch.
 */
export async function playSoundboardCue(): Promise<SoundboardCueReceipt | null> {
  const AudioContextCtor = globalThis.AudioContext;
  if (!AudioContextCtor) return null;

  const requestedAt = performance.now();
  audioContext ??= new AudioContextCtor({ latencyHint: "interactive" });
  if (audioContext.state === "suspended") await audioContext.resume();

  const startAt = audioContext.currentTime + 0.005;
  const gain = audioContext.createGain();
  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(740, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(1040, startAt + 0.07);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.055, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.12);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.125);

  const startupLatencyMs =
    performance.now() - requestedAt +
    Math.max(0, startAt - audioContext.currentTime) * 1_000;
  return {
    startupLatencyMs,
    withinBudget: startupLatencyMs <= SOUNDBOARD_START_BUDGET_MS,
  };
}
