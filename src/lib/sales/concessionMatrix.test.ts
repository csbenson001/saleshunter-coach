import { describe, it, expect } from "vitest";
import { detectConcessionDemands, CONCESSION_TRADE_MATRIX } from "./concessionMatrix";

describe("Instant Concession Trade Matrix & Give-to-Get HUD", () => {
  it("detects procurement discount demands instantly (<1.8s latency SLA)", () => {
    const buyerInput = "We like the product, but you need to give us a discount of at least 20% off or we walk.";
    const result = detectConcessionDemands(buyerInput);

    expect(result.detected).toBe(true);
    expect(result.concession?.id).toBe("concession_discount");
    expect(result.concession?.category).toBe("discount");
    expect(result.latencySeconds).toBeLessThan(1.8);
    expect(result.spineRating).toBe("Ironclad");
    expect(result.concession?.quotaImpactEstimateUsd).toBe(4200);
  });

  it("provides non-cash give-to-get trade demands instead of free concessions", () => {
    const result = detectConcessionDemands("Can you do net 60 terms for our accounting team?");

    expect(result.detected).toBe(true);
    expect(result.concession?.category).toBe("payment_terms");
    expect(result.concession?.recommendedTradeDemands.length).toBeGreaterThanOrEqual(1);

    const tradeLabels = result.concession?.recommendedTradeDemands.map((t) => t.label);
    expect(tradeLabels).toContain("Volume Expansion Tier");
  });

  it("triggers onboarding close-date acceleration lever on setup fee pushback", () => {
    const result = detectConcessionDemands("Can you waive implementation fee for our launch?");

    expect(result.detected).toBe(true);
    expect(result.concession?.id).toBe("concession_onboarding");
    expect(result.concession?.exactCounterpunchScript).toContain("countersign by this Friday");
  });

  it("returns detected: false cleanly for normal discovery dialogue", () => {
    const normalInput = "How does your audio loopback integrate with our Zoom calls?";
    const result = detectConcessionDemands(normalInput);

    expect(result.detected).toBe(false);
    expect(result.concession).toBeUndefined();
  });

  it("all trade matrix entries have positive quota ARR impact", () => {
    for (const demand of CONCESSION_TRADE_MATRIX) {
      expect(demand.quotaImpactEstimateUsd).toBeGreaterThanOrEqual(2000);
      expect(demand.exactCounterpunchScript.length).toBeGreaterThan(20);
      expect(demand.recommendedTradeDemands.length).toBeGreaterThan(0);
    }
  });
});
