import { describe, expect, it } from "vitest";
import { detectConcessionPressure } from "./concessionVault";

const EXPECTED_TRADE_IDS = [
  "payment_terms",
  "contract_duration",
  "marketing_value",
] as const;

describe("concession vault pressure-to-trade public seam", () => {
  it.each([
    ["That is too expensive for our team.", "too_expensive"],
    ["Give us 20% off and we can get this approved.", "discount_request"],
    ["We need budget relief before we can sign.", "budget_relief"],
  ] as const)("detects %s as %s", (utterance, intent) => {
    const started = performance.now();
    const cue = detectConcessionPressure(utterance);
    const elapsedMs = performance.now() - started;

    expect(elapsedMs).toBeLessThan(1_500);
    expect(cue).toEqual(expect.objectContaining({ detected: true, intent }));
    expect(cue?.tradeOptions.map((trade) => trade.id)).toEqual(EXPECTED_TRADE_IDS);
  });

  it("returns the exact give-to-get terms for every canonical archetype", () => {
    const cue = detectConcessionPressure("Can you give us 20% off?");

    expect(cue?.tradeOptions).toEqual([
      {
        id: "payment_terms",
        discountPercent: 5,
        give: "5% discount",
        get: "Net-15 payment terms",
        label: expect.any(String),
      },
      {
        id: "contract_duration",
        discountPercent: 10,
        give: "10% discount",
        get: "24-month upfront agreement",
        label: expect.any(String),
      },
      {
        id: "marketing_value",
        discountPercent: 5,
        give: "5% discount",
        get: "Quarterly co-marketing case study & reference calls",
        label: expect.any(String),
      },
    ]);
  });

  it("does not surface a trade matrix for unrelated discovery dialogue", () => {
    expect(detectConcessionPressure("How does the Zoom integration work?")).toBeNull();
  });
});
