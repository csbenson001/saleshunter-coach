import { describe, it, expect } from "vitest";
import { auditSalesCapability } from "./salesJudge";

describe("Tough Sales Person Persona Judge Engine", () => {
  it("rejects weak, apologetic, low-commercial capability as shelfware or conditional pass", () => {
    const weakTarget = {
      featureName: "Passive Meeting Politeness Monitor",
      category: "in_call_cue" as const,
      inputContext: "Prospect asks: Why are you so expensive?",
      solutionOutput:
        "Maybe we can offer a discount if that's okay with you? Hopefully our pricing works for your team. Sorry about the high price tag.",
      targetBuyerPersona: "CFO",
      dealSizeUsd: 50000,
    };

    const audit = auditSalesCapability(weakTarget);
    expect(audit.verdict).toBe("REJECT_AS_SHELFWARE");
    expect(audit.overallScore).toBeLessThan(70);
    expect(audit.executiveCritique).toContain("REJECTED AS SHELFWARE");
  });

  it("certifies lethal, glanceable, high-ROI deal-closing capabilities", () => {
    const strongTarget = {
      featureName: "CFO ROI Pivot Objection Buster",
      category: "objection_response" as const,
      inputContext: "Prospect says: Your budget is higher than alternative tools.",
      solutionOutput:
        "What metric are you measuring to justify keeping your current churn rate? If this saves 2 deals/quarter, it pays for itself 10x over. Who else is the economic buyer on the decision committee?",
      targetBuyerPersona: "CFO",
      dealSizeUsd: 75000,
    };

    const audit = auditSalesCapability(strongTarget);
    expect(audit.verdict).toBe("DEAL_CLOSER_CERTIFIED");
    expect(audit.overallScore).toBeGreaterThanOrEqual(85);
    expect(audit.repUsabilityVerdict).toBe("Glanceable & lethal");
    expect(audit.dollarRoiMultiplierEstimate).toContain("pipeline ROI");
  });

  it("flags in-call cues that are too long for live conversation", () => {
    const wordyTarget = {
      featureName: "Verbose Live Cue",
      category: "in_call_cue" as const,
      inputContext: "Customer mentions competitor",
      solutionOutput:
        "When dealing with this competitor, it is critical to keep in mind their historical architectural shortcomings that originated in 2018 when they first designed their database schema. You should articulate to the prospective buyer that while they have market share, their lack of SOC2 type 2 certification until recently caused issues, and you should bring up three distinct case studies from our marketing collateral...",
    };

    const audit = auditSalesCapability(wordyTarget);
    expect(audit.repUsabilityVerdict).toBe("Too complex in-call");
    const latencyItem = audit.rubricBreakdown.find((r) => r.criterion.includes("Glanceability"));
    expect(latencyItem?.score).toBeLessThan(60);
  });
});
