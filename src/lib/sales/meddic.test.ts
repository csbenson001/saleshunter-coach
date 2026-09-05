import { describe, it, expect } from "vitest";
import { evaluateMeddicProgress, INITIAL_MEDDIC_CRITERIA } from "./meddic";

describe("meddic qualification engine", () => {
  it("starts at 0% with no criteria detected", () => {
    const { updated, scorePercent } = evaluateMeddicProgress("");
    expect(scorePercent).toBe(0);
    expect(updated.every((i) => !i.detected)).toBe(true);
  });

  it("detects pain, metrics, and economic buyer automatically", () => {
    const speech = "Our biggest challenge is we are losing deals because our team lacks a live coach. We need a 25% increase in conversion and our CFO has sign-off on the budget.";
    const { updated, scorePercent } = evaluateMeddicProgress(speech, INITIAL_MEDDIC_CRITERIA);

    const pain = updated.find((i) => i.key === "I");
    const metrics = updated.find((i) => i.key === "M");
    const buyer = updated.find((i) => i.key === "E");

    expect(pain?.detected).toBe(true);
    expect(metrics?.detected).toBe(true);
    expect(buyer?.detected).toBe(true);
    expect(scorePercent).toBe(50); // 3 of 6 = 50%
  });

  it("preserves previously detected criteria across transcript segments", () => {
    const firstPass = evaluateMeddicProgress("We need a 20% growth.", INITIAL_MEDDIC_CRITERIA);
    expect(firstPass.updated.find((i) => i.key === "M")?.detected).toBe(true);

    const secondPass = evaluateMeddicProgress("The procurement process requires a SOC-2 report.", firstPass.updated);
    expect(secondPass.updated.find((i) => i.key === "M")?.detected).toBe(true);
    expect(secondPass.updated.find((i) => i.key === "DP")?.detected).toBe(true);
    expect(secondPass.scorePercent).toBeGreaterThan(30);
  });
});
