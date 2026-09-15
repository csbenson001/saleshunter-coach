import type { TranscriptSegment } from "../types";
import { detectConcessionDemands } from "./concessionMatrix";
import { evaluateLiveDealRisk } from "./liveDealRisk";

export const EXECUTIVE_MEMO_SLA_MS = 15_000;
export const EXECUTIVE_MEMO_TIMEOUT_CODE = "EXECUTIVE_MEMO_TIMEOUT";

export type MeddicKey = "M" | "E" | "DC" | "DP" | "I" | "C";
export type DealHealthGrade = "A" | "B" | "C" | "D" | "F";
export type DiscountExposure = "none" | "low" | "medium" | "high";

export interface MutualAction {
  owner: "seller" | "prospect" | "mutual";
  action: string;
  dueDate?: string;
}

export interface ExecutiveDealMemoInput {
  callId: string;
  callTitle: string;
  callEndedAtMs: number;
  segments: readonly TranscriptSegment[];
  prospectName?: string;
}

export interface ExecutiveDealMemoDraft {
  agreedProblem: string;
  proposedSolution: string;
  timeline: string;
  mutualActionPlan: readonly MutualAction[];
}

export interface ExecutiveDealMemo {
  callId: string;
  generatedAtMs: number;
  clientFacing: {
    recap: string;
    emailSubject: string;
    emailBody: string;
  };
  mutualActionPlan: readonly MutualAction[];
  internal: {
    grade: DealHealthGrade;
    healthScore: number;
    missingMeddicComponents: readonly MeddicKey[];
    discountExposure: DiscountExposure;
    riskEvidence: readonly string[];
  };
}

export interface ExecutiveDealMemoOptions {
  generateDraft: (input: ExecutiveDealMemoInput) => Promise<ExecutiveDealMemoDraft>;
  now?: () => number;
}

export class ExecutiveDealMemoTimeoutError extends Error {
  readonly code = EXECUTIVE_MEMO_TIMEOUT_CODE;

  constructor() {
    super(`Executive deal memo generation exceeded ${EXECUTIVE_MEMO_SLA_MS} ms`);
    this.name = "ExecutiveDealMemoTimeoutError";
  }
}

function finalSpokenSegments(segments: readonly TranscriptSegment[]): TranscriptSegment[] {
  const latestById = new Map<string, { segment: TranscriptSegment; index: number }>();
  segments.forEach((segment, index) => {
    latestById.set(segment.id, { segment, index });
  });

  return [...latestById.values()]
    .filter(({ segment }) => segment.isFinal && segment.text.trim().length > 0)
    .sort((left, right) =>
      left.segment.startMs - right.segment.startMs || left.index - right.index,
    )
    .map(({ segment }) => segment);
}

function recapFor(draft: ExecutiveDealMemoDraft): string {
  const actions = draft.mutualActionPlan.map((action) => {
    const due = action.dueDate ? ` by ${action.dueDate}` : "";
    return `- ${capitalize(action.owner)}: ${action.action}${due}`;
  });

  return [
    `Agreed problem: ${draft.agreedProblem}`,
    `Proposed solution: ${draft.proposedSolution}`,
    `Timeline: ${draft.timeline}`,
    "Mutual action plan:",
    ...actions,
  ].join("\n");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function gradeFor(score: number): DealHealthGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function exposureFor(segments: readonly TranscriptSegment[]): {
  exposure: DiscountExposure;
  evidence: string[];
} {
  let exposure: DiscountExposure = "none";
  const evidence: string[] = [];

  for (const segment of segments) {
    const detection = detectConcessionDemands(segment.text);
    if (!detection.detected || !detection.concession || !detection.matchPhrase) continue;

    evidence.push(detection.matchPhrase);
    const nextExposure: DiscountExposure =
      detection.concession.category === "discount"
        ? "high"
        : detection.concession.category === "payment_terms"
          ? "medium"
          : "low";
    if (exposure === "none" || rankExposure(nextExposure) > rankExposure(exposure)) {
      exposure = nextExposure;
    }
  }

  return { exposure, evidence };
}

function rankExposure(exposure: DiscountExposure): number {
  return { none: 0, low: 1, medium: 2, high: 3 }[exposure];
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new ExecutiveDealMemoTimeoutError()), EXECUTIVE_MEMO_SLA_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}

export async function generateExecutiveDealMemo(
  input: ExecutiveDealMemoInput,
  options: ExecutiveDealMemoOptions,
): Promise<ExecutiveDealMemo> {
  const finalSegments = finalSpokenSegments(input.segments);
  if (finalSegments.length === 0) {
    throw new Error("Executive deal memo requires at least one final spoken segment");
  }

  const draft = await withTimeout(
    Promise.resolve().then(() => options.generateDraft({ ...input, segments: finalSegments })),
  );
  const risk = evaluateLiveDealRisk(finalSegments);
  const concession = exposureFor(finalSegments);
  const riskEvidence = [
    ...risk.risks.map((item) => item.matchedPhrase),
    ...concession.evidence,
  ].filter((phrase, index, all) => all.indexOf(phrase) === index);
  const recap = recapFor(draft);
  const prospect = input.prospectName?.trim() || "there";
  const emailBody = `Hi ${prospect},\n\n${recap}\n\nBest regards,`;
  const generatedAtMs = (options.now ?? (() => input.callEndedAtMs))();

  return {
    callId: input.callId,
    generatedAtMs,
    clientFacing: {
      recap,
      emailSubject: `Follow-up: ${input.callTitle}`,
      emailBody,
    },
    mutualActionPlan: draft.mutualActionPlan,
    internal: {
      grade: gradeFor(risk.healthScore),
      healthScore: risk.healthScore,
      missingMeddicComponents: risk.qualification
        .filter((item) => item.status === "missing")
        .map((item) => item.key),
      discountExposure: concession.exposure,
      riskEvidence,
    },
  };
}
