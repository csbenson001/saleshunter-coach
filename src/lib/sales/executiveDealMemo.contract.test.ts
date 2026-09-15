import { describe, expect, it, vi } from "vitest";
import {
  EXECUTIVE_MEMO_SLA_MS,
  EXECUTIVE_MEMO_TIMEOUT_CODE,
  generateExecutiveDealMemo,
  type ExecutiveDealMemoDraft,
} from "./executiveDealMemo";
import type { TranscriptSegment } from "../types";

function segment(
  id: string,
  source: TranscriptSegment["source"],
  startMs: number,
  endMs: number,
  text: string,
  isFinal = true,
): TranscriptSegment {
  return { id, source, speaker: 0, startMs, endMs, text, isFinal };
}

const INPUT = {
  callId: "call-sal-22",
  callTitle: "Acme enterprise discovery",
  callEndedAtMs: 100_000,
  prospectName: "Jordan",
  segments: [
    segment(
      "pain",
      "them",
      0,
      8_000,
      "Our biggest challenge is missed quota because reps cannot respond to objections quickly.",
    ),
    segment(
      "solution",
      "me",
      8_000,
      16_000,
      "The proposed solution is SalesHunter live coaching for the team's sales calls.",
    ),
    segment(
      "timeline",
      "them",
      16_000,
      22_000,
      "We can start the evaluation next Monday and review the outcome after two weeks.",
    ),
    segment(
      "price",
      "them",
      22_000,
      26_000,
      "Can you do 20% off for the evaluation?",
    ),
    segment("partial", "them", 26_000, 28_000, "We might ask our CFO", false),
  ],
} as const;

const DRAFT: ExecutiveDealMemoDraft = {
  agreedProblem: "Missed quota caused by slow objection response.",
  proposedSolution: "Evaluate SalesHunter live coaching for the sales team.",
  timeline: "Start next Monday and review results after two weeks.",
  mutualActionPlan: [
    { owner: "seller", action: "Send the evaluation setup guide", dueDate: "Friday" },
    { owner: "prospect", action: "Confirm the evaluation team", dueDate: "Monday" },
  ],
};

describe("post-call executive deal memo contract", () => {
  it("keeps the client recap commitment-only and reports MEDDIC and discount risk", async () => {
    const memo = await generateExecutiveDealMemo(INPUT, {
      now: () => INPUT.callEndedAtMs + 1_200,
      generateDraft: async () => DRAFT,
    });

    const recapWords = memo.clientFacing.recap.trim().split(/\s+/u);
    expect(recapWords.length).toBeLessThan(150);
    expect(memo.clientFacing.recap).toContain(DRAFT.agreedProblem);
    expect(memo.clientFacing.recap).toContain(DRAFT.proposedSolution);
    expect(memo.clientFacing.recap).toContain(DRAFT.timeline);
    for (const action of DRAFT.mutualActionPlan) {
      expect(memo.clientFacing.recap).toContain(action.action);
      expect(memo.clientFacing.recap).toContain(action.dueDate!);
    }
    expect(memo.clientFacing.recap).not.toContain("activate your trial");

    expect(memo.internal).toMatchObject({
      grade: "C",
      healthScore: 55,
      missingMeddicComponents: ["M", "E", "DC", "DP", "C"],
      discountExposure: "high",
    });
    expect(memo.internal.riskEvidence).toEqual(expect.arrayContaining(["20% off"]));
    expect(memo.generatedAtMs - INPUT.callEndedAtMs).toBeLessThanOrEqual(EXECUTIVE_MEMO_SLA_MS);
    expect(memo.clientFacing.emailBody).toContain(memo.clientFacing.recap);
  });

  it("uses the injected clock and draft seam without hidden network or browser work", async () => {
    const generateDraft = vi.fn(async () => DRAFT);
    const memo = await generateExecutiveDealMemo(
      { ...INPUT, segments: [INPUT.segments[0]] },
      { now: () => 2_345, generateDraft },
    );

    expect(memo.generatedAtMs).toBe(2_345);
    expect(memo.callId).toBe(INPUT.callId);
    expect(generateDraft).toHaveBeenCalledTimes(1);
  });

  it("rejects a provider that misses the 15-second deadline without publishing a memo", async () => {
    vi.useFakeTimers();
    try {
      const result = generateExecutiveDealMemo(INPUT, {
        generateDraft: () => new Promise<ExecutiveDealMemoDraft>(() => undefined),
      });
      const assertion = expect(result).rejects.toMatchObject({
        code: EXECUTIVE_MEMO_TIMEOUT_CODE,
      });

      await vi.advanceTimersByTimeAsync(EXECUTIVE_MEMO_SLA_MS);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
