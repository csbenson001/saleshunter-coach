import { describe, it, expect } from "vitest";
import { executeProvingGroundSimulation, BATTLE_SCENARIOS } from "./provingGround";

describe("Battlefield Proving Ground Engine", () => {
  it("executes all battle scenarios with sub-100ms latency and high proof verdict", () => {
    for (const scenario of BATTLE_SCENARIOS) {
      const result = executeProvingGroundSimulation(scenario.id);
      expect(result.scenarioId).toBe(scenario.id);
      expect(result.latencyMs).toBeLessThan(400);
      expect(result.crmPayloadGenerated).toBe(true);
      expect(result.proofVerdict).toMatch(/PROVEN_LETHAL|PROVEN_VIABLE/);
      expect(result.closerAudit).toBeDefined();
    }
  });

  it("proves objection handling turnaround on the CFO budget freeze scenario", () => {
    const result = executeProvingGroundSimulation("cfo_budget_freeze");
    expect(result.scorecardNumeric).toBeGreaterThanOrEqual(75);
    expect(result.signalsDetected.length).toBeGreaterThan(0);
  });

  it("certifies the Gong coexistence defense under incumbent pressure", () => {
    const result = executeProvingGroundSimulation("gong_competitor_ambush");

    expect(result.coexistenceDefenseTriggered).toBe(true);
    expect(result.pilotSuccessMetric).toBe("time_to_close");
    expect(result.closerAudit.verdict).toBe("DEAL_CLOSER_CERTIFIED");
    expect(result.closerAudit.repUsabilityVerdict).toBe("Glanceable & lethal");
    expect(result.closerAudit.dollarRoiMultiplierEstimate).toContain("100x");
    expect(result.proofVerdict).toBe("PROVEN_LETHAL");
  });
});
