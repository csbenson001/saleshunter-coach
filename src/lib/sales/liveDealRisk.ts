import { INITIAL_MEDDIC_CRITERIA } from "./meddic";
import {
  analyzeDealSignalsAt,
  calculateDealHealth,
  type DealRisk,
  type DealSignal,
} from "./dealSignals";
import type { TranscriptSegment } from "../types";

export const TALK_TIME_ALERT_RATIO = 0.65;
export const TALK_TIME_ALERT_SUSTAIN_MS = 90_000;

type QualificationStatus = "confirmed" | "missing";
type BadgeTone = "green" | "red";

export interface LiveQualificationEntry {
  key: "M" | "E" | "DC" | "DP" | "I" | "C";
  status: QualificationStatus;
  badgeTone: BadgeTone;
  evidenceQuote?: string;
}

export interface TalkTimeAlert {
  ratio: number;
  sustainedMs: number;
  thresholdRatio: typeof TALK_TIME_ALERT_RATIO;
  thresholdMs: typeof TALK_TIME_ALERT_SUSTAIN_MS;
}

export interface LiveDealRiskReport {
  qualification: LiveQualificationEntry[];
  healthScore: number;
  momentum: "positive" | "neutral" | "at_risk";
  buyingSignals: DealSignal[];
  risks: DealRisk[];
  talkTimeRatio: { me: number; them: number } | null;
  talkTimeAlert: TalkTimeAlert | null;
}

interface OrderedSegment {
  segment: TranscriptSegment;
  index: number;
}

function finalizedSegments(segments: readonly TranscriptSegment[]): TranscriptSegment[] {
  const latestById = new Map<string, OrderedSegment>();
  segments.forEach((segment, index) => {
    latestById.set(segment.id, { segment, index });
  });

  return [...latestById.values()]
    .filter(({ segment }) => segment.isFinal)
    .sort((left, right) =>
      left.segment.startMs - right.segment.startMs || left.index - right.index,
    )
    .map(({ segment }) => segment);
}

function qualificationFrom(segments: readonly TranscriptSegment[]): LiveQualificationEntry[] {
  const evidenceByKey = new Map<LiveQualificationEntry["key"], string>();

  for (const segment of segments) {
    for (const criterion of INITIAL_MEDDIC_CRITERIA) {
      if (evidenceByKey.has(criterion.key)) continue;
      const match = criterion.detectionKeywords.exec(segment.text);
      if (match) evidenceByKey.set(criterion.key, match[0]);
    }
  }

  return INITIAL_MEDDIC_CRITERIA.map(({ key }) => {
    const evidenceQuote = evidenceByKey.get(key);
    return evidenceQuote
      ? { key, status: "confirmed", badgeTone: "green", evidenceQuote }
      : { key, status: "missing", badgeTone: "red" };
  });
}

function talkTimeFrom(segments: readonly TranscriptSegment[]): {
  ratio: { me: number; them: number } | null;
  alert: TalkTimeAlert | null;
} {
  const speech = segments.filter((segment) => segment.source === "me" || segment.source === "them");
  let meMs = 0;
  let themMs = 0;
  let firstStartMs = Number.POSITIVE_INFINITY;
  let lastEndMs = Number.NEGATIVE_INFINITY;

  for (const segment of speech) {
    const durationMs = Math.max(0, segment.endMs - segment.startMs);
    if (segment.source === "me") meMs += durationMs;
    else themMs += durationMs;
    firstStartMs = Math.min(firstStartMs, segment.startMs);
    lastEndMs = Math.max(lastEndMs, segment.endMs);
  }

  const totalMs = meMs + themMs;
  if (totalMs === 0) return { ratio: null, alert: null };

  const ratio = { me: meMs / totalMs, them: themMs / totalMs };
  const sustainedMs = Math.max(0, lastEndMs - firstStartMs);
  const alert: TalkTimeAlert | null =
    ratio.me > TALK_TIME_ALERT_RATIO && sustainedMs > TALK_TIME_ALERT_SUSTAIN_MS
      ? {
          ratio: ratio.me,
          sustainedMs,
          thresholdRatio: TALK_TIME_ALERT_RATIO,
          thresholdMs: TALK_TIME_ALERT_SUSTAIN_MS,
        }
      : null;

  return { ratio, alert };
}

export function evaluateLiveDealRisk(
  segments: readonly TranscriptSegment[],
): LiveDealRiskReport {
  const finalized = finalizedSegments(segments);
  const qualification = qualificationFrom(finalized);
  const signals: DealSignal[] = [];
  const risks: DealRisk[] = [];

  for (const segment of finalized) {
    const detected = analyzeDealSignalsAt(segment.text, segment.startMs, segment.id);
    signals.push(...detected.signals);
    risks.push(...detected.risks);
  }

  const health = calculateDealHealth(signals, risks);
  const talkTime = talkTimeFrom(finalized);

  return {
    qualification,
    healthScore: health.healthScore,
    momentum: health.momentum,
    buyingSignals: signals,
    risks,
    talkTimeRatio: talkTime.ratio,
    talkTimeAlert: talkTime.alert,
  };
}
