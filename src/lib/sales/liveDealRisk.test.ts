import { describe, expect, it } from "vitest";
import {
  evaluateLiveDealRisk,
  TALK_TIME_ALERT_RATIO,
  TALK_TIME_ALERT_SUSTAIN_MS,
} from "./liveDealRisk";
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

const QUALIFICATION_FIXTURE: TranscriptSegment[] = [
  segment("pain", "them", 0, 18_000, "Our biggest challenge is costing us several hours every week."),
  segment("buyer", "them", 18_000, 32_000, "Our CFO is the budget owner and has sign-off authority."),
  segment("criteria", "them", 32_000, 48_000, "The evaluation criteria include SOC-2 and integration capability."),
];

const HIGH_RISK_FIXTURE: TranscriptSegment[] = [
  segment("rep-1", "me", 0, 60_000, "Let me walk through the platform and the rollout plan."),
  segment("prospect-1", "them", 60_000, 80_000, "We have no budget for this right now."),
  segment("rep-2", "me", 80_000, 140_000, "I can explain why the cost is justified and cover every feature."),
  segment("prospect-2", "them", 140_000, 155_000, "It is not my decision, and procurement will need to review it."),
  segment("rep-3", "me", 155_000, 180_500, "We can keep going through the deck and revisit the details later."),
  segment("prospect-3", "them", 180_500, 195_000, "Please check back next quarter; this is not a priority right now."),
];

describe("live MEDDIC qualification tracking", () => {
  it("identifies economic buyer, decision criteria, and pain with badge-ready statuses", () => {
    const report = evaluateLiveDealRisk(QUALIFICATION_FIXTURE);

    for (const key of ["E", "DC", "I"] as const) {
      const criterion = report.qualification.find((item) => item.key === key);
      expect(criterion).toMatchObject({ status: "confirmed", badgeTone: "green" });
      expect(criterion?.evidenceQuote).toBeTruthy();
    }

    expect(report.qualification.find((item) => item.key === "E")?.evidenceQuote).toBe("CFO");
    expect(report.qualification.find((item) => item.key === "DC")?.evidenceQuote).toBe("evaluation criteria");
    expect(report.qualification.find((item) => item.key === "I")?.evidenceQuote).toBe("biggest challenge");
  });

  it("does not confirm a criterion from an interim transcript segment", () => {
    const report = evaluateLiveDealRisk([
      segment("partial", "them", 0, 8_000, "Our biggest challenge is", false),
    ]);

    expect(report.qualification.find((item) => item.key === "I")).toMatchObject({
      status: "missing",
      badgeTone: "red",
    });
  });
});

describe("live deal risk and talk-time warning", () => {
  it("scores a synthetic high-risk deal and alerts after sustained rep over-talking", () => {
    const report = evaluateLiveDealRisk(HIGH_RISK_FIXTURE);

    expect(report.momentum).toBe("at_risk");
    expect(report.healthScore).toBeLessThanOrEqual(45);
    expect(report.risks.map((risk) => risk.category)).toEqual(
      expect.arrayContaining(["budget_freeze", "authority_gap", "timeline_slip"]),
    );
    expect(report.talkTimeRatio?.me).toBeGreaterThan(TALK_TIME_ALERT_RATIO);
    expect(report.talkTimeAlert).toMatchObject({
      thresholdRatio: TALK_TIME_ALERT_RATIO,
      thresholdMs: TALK_TIME_ALERT_SUSTAIN_MS,
    });
    expect(report.talkTimeAlert?.ratio).toBe(report.talkTimeRatio?.me);
    expect(report.talkTimeAlert?.sustainedMs).toBeGreaterThan(TALK_TIME_ALERT_SUSTAIN_MS);
  });

  it("does not alert at the exact ratio or duration boundaries", () => {
    const exactlyAtRatio = [
      segment("me", "me", 0, 65_000, "rep"),
      segment("them", "them", 65_000, 100_000, "prospect"),
    ];
    const exactlyAtDuration = [
      segment("me", "me", 0, 60_000, "rep"),
      segment("them", "them", 60_000, 90_000, "prospect"),
      segment("me-2", "me", 90_000, 90_000, "rep"),
    ];

    expect(evaluateLiveDealRisk(exactlyAtRatio).talkTimeAlert).toBeNull();
    expect(evaluateLiveDealRisk(exactlyAtDuration).talkTimeAlert).toBeNull();
  });
});
