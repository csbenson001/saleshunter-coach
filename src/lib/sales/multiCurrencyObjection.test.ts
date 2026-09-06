import { describe, it, expect } from "vitest";
import {
  detectMultiCurrencyObjection,
  matchMultiCurrencyObjection,
  MULTI_CURRENCY_OBJECTION_CARDS,
} from "./multiCurrencyObjection";

describe("multiCurrencyObjection engine", () => {
  it("detects Euro (EUR) billing pushback with sub-1.8s SLA", () => {
    const text = "Our board policy says we can only pay in euros due to exchange rate risk.";
    const result = detectMultiCurrencyObjection(text);

    expect(result.detected).toBe(true);
    expect(result.card?.currencyKey).toBe("EUR");
    expect(result.latencySeconds).toBeLessThan(1.8);
    expect(result.card?.rebuttalScript).toContain("Euros");
    expect(result.card?.followUpQuestion).toContain("annual pre-pay");
    expect(result.card?.projectedArrImpactUsd).toBe(8500);
    expect(result.card?.targetRoiMultiplier).toBe("50x ROI");
  });

  it("detects GBP currency requirement and provides give-to-get trades", () => {
    const text = "We need an invoice in GBP for our London headquarters.";
    const card = matchMultiCurrencyObjection(text);

    expect(card).toBeDefined();
    expect(card?.currencyKey).toBe("GBP");
    expect(card?.recommendedTrades.length).toBeGreaterThan(0);
    expect(card?.recommendedTrades[0].tradeAsk).toContain("annual upfront");
  });

  it("detects general foreign exchange (FX) volatility objections", () => {
    const text = "There is too much currency fluctuation and cross-border fee overhead right now.";
    const card = matchMultiCurrencyObjection(text);

    expect(card).toBeDefined();
    expect(card?.currencyKey).toBe("GLOBAL_FX");
    expect(card?.rebuttalScript).toContain("fixed exchange rate collars");
    expect(card?.repWarning).toContain("FX VOLATILITY BLUFF");
  });

  it("returns detected: false for normal conversation", () => {
    const result = detectMultiCurrencyObjection("Can we schedule the product demo for tomorrow?");
    expect(result.detected).toBe(false);
    expect(result.card).toBeUndefined();
  });

  it("enforces commercial spine with non-zero trade requirements", () => {
    for (const card of MULTI_CURRENCY_OBJECTION_CARDS) {
      expect(card.recommendedTrades.length).toBeGreaterThanOrEqual(2);
      for (const trade of card.recommendedTrades) {
        expect(trade.commercialValue).toBeDefined();
        expect(trade.commercialValue.length).toBeGreaterThan(0);
      }
    }
  });
});
