import { describe, it, expect } from "vitest";
import { seg } from "../test/fixtures";
import {
  analyzeDealSignals,
  analyzeStakeholderCoverage,
  calculateDealHealth,
  stakeholderBlindspotRisk,
  STAKEHOLDER_BLINDSPOT_THRESHOLD_MS,
} from "./dealSignals";

describe("dealSignals intelligence engine", () => {
  it("detects pricing and timeline buying signals", () => {
    const text = "We really want to know what is the cost and when can we start onboarding.";
    const { signals, risks } = analyzeDealSignals(text);

    expect(signals.length).toBeGreaterThanOrEqual(2);
    expect(signals.some((s) => s.category === "pricing")).toBe(true);
    expect(signals.some((s) => s.category === "timeline")).toBe(true);
    expect(risks.length).toBe(0);
  });

  it("detects budget and competitor risks with coaching advice", () => {
    const text = "We have a severe budget freeze right now and we are also looking at Gong.";
    const { risks } = analyzeDealSignals(text);

    expect(risks.length).toBe(2);
    const budgetRisk = risks.find((r) => r.category === "budget_freeze");
    expect(budgetRisk).toBeDefined();
    expect(budgetRisk?.severity).toBe("high");
    expect(budgetRisk?.coachingAdvice).toContain("ROI");

    const compRisk = risks.find((r) => r.category === "competitor_threat");
    expect(compRisk).toBeDefined();
  });

  it("calculates positive deal health when buying signals outweigh risks", () => {
    const { signals } = analyzeDealSignals("How much is it and when can we start? Also show this to my VP.");
    const health = calculateDealHealth(signals, []);

    expect(health.healthScore).toBeGreaterThanOrEqual(70);
    expect(health.momentum).toBe("positive");
  });

  it("calculates at-risk status when severe risks are detected", () => {
    const { risks } = analyzeDealSignals("We have no budget and please check back next quarter.");
    const health = calculateDealHealth([], risks);

    expect(health.healthScore).toBeLessThanOrEqual(45);
    expect(health.momentum).toBe("at_risk");
  });

  it("waits 15 minutes before flagging an unconfirmed economic buyer", () => {
    const segments = [
      seg({ id: "champion", source: "them", speaker: 1, text: "I can show this to our finance team." }),
    ];

    expect(
      analyzeStakeholderCoverage(segments, STAKEHOLDER_BLINDSPOT_THRESHOLD_MS - 1)
        .blindspotDetected
    ).toBe(false);

    const coverage = analyzeStakeholderCoverage(
      segments,
      STAKEHOLDER_BLINDSPOT_THRESHOLD_MS
    );
    expect(coverage).toMatchObject({
      stakeholderCount: 1,
      economicBuyerConfirmed: false,
      blindspotDetected: true,
    });
  });

  it("keeps the alert active with multiple stakeholders until authority is confirmed", () => {
    const coverage = analyzeStakeholderCoverage(
      [
        seg({ id: "one", source: "them", speaker: 1, text: "The workflow looks useful." }),
        seg({ id: "two", source: "them", speaker: 2, text: "Security needs an architecture review." }),
      ],
      STAKEHOLDER_BLINDSPOT_THRESHOLD_MS
    );

    expect(coverage).toMatchObject({
      stakeholderCount: 2,
      economicBuyerConfirmed: false,
      blindspotDetected: true,
    });
  });

  it("does not mistake a champion delegating approval for the economic buyer", () => {
    const coverage = analyzeStakeholderCoverage(
      [
        seg({
          id: "champion",
          source: "them",
          speaker: 1,
          text: "I will ask our CFO to approve the purchase after this call.",
        }),
      ],
      STAKEHOLDER_BLINDSPOT_THRESHOLD_MS
    );

    expect(coverage.economicBuyerConfirmed).toBe(false);
    expect(coverage.blindspotDetected).toBe(true);
  });

  it("clears the blindspot when a speaking participant confirms budget authority", () => {
    const authorityStatement = analyzeStakeholderCoverage(
      [
        seg({
          id: "buyer",
          source: "them",
          speaker: 2,
          text: "I can approve and sign the purchase contract this quarter.",
        }),
      ],
      STAKEHOLDER_BLINDSPOT_THRESHOLD_MS
    );
    const namedBuyer = analyzeStakeholderCoverage(
      [seg({ id: "cfo", source: "them", speaker: 3, text: "Let's review the proposal." })],
      STAKEHOLDER_BLINDSPOT_THRESHOLD_MS,
      { "them-3": "Morgan, CFO" }
    );

    expect(authorityStatement.economicBuyerConfirmed).toBe(true);
    expect(authorityStatement.blindspotDetected).toBe(false);
    expect(namedBuyer.economicBuyerConfirmed).toBe(true);
    expect(namedBuyer.blindspotDetected).toBe(false);
  });

  it("emits one stable high-severity risk for the existing live HUD", () => {
    const coverage = analyzeStakeholderCoverage([], STAKEHOLDER_BLINDSPOT_THRESHOLD_MS);
    const risk = stakeholderBlindspotRisk(coverage, {
      label: "Stakeholder Blindspot",
      coachingAdvice: "Ask for the economic buyer.",
    });

    expect(risk).toMatchObject({
      id: "risk_stakeholder_blindspot_15m",
      category: "stakeholder_blindspot",
      severity: "high",
      timestampMs: STAKEHOLDER_BLINDSPOT_THRESHOLD_MS,
    });
  });
});
