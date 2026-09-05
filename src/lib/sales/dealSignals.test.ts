import { describe, it, expect } from "vitest";
import { analyzeDealSignals, calculateDealHealth } from "./dealSignals";

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
});
