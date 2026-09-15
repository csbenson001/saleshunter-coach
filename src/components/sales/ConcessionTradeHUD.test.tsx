import { create } from "react-test-renderer";
import React from "react";
import { describe, expect, it } from "vitest";
import { ConcessionTradeHUD } from "./ConcessionTradeHUD";
import type { ConcessionDemand } from "../../lib/sales/concessionMatrix";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CONCESSION: ConcessionDemand = {
  id: "concession_discount",
  category: "discount",
  buyerPhrases: ["too expensive"],
  repWarning: "Protect price with a trade.",
  recommendedTradeDemands: [
    {
      id: "payment_terms",
      label: "Payment terms",
      tradeAsk: "5% discount for Net-15 payment terms",
      commercialValue: "Net-15",
    },
    {
      id: "contract_duration",
      label: "Contract duration",
      tradeAsk: "10% discount for a 24-month upfront agreement",
      commercialValue: "24 months upfront",
    },
    {
      id: "marketing_value",
      label: "Marketing value",
      tradeAsk: "5% discount for a quarterly co-marketing case study & reference calls",
      commercialValue: "Referenceable customer",
    },
  ],
  exactCounterpunchScript: "We trade price for value.",
  quotaImpactEstimateUsd: 4200,
};

describe("concession vault HUD card interaction", () => {
  it("renders three semantic trade buttons and selects one on the first click", () => {
    const selected: string[] = [];
    let renderer!: ReturnType<typeof create>;
    React.act(() => {
      renderer = create(
        <ConcessionTradeHUD
          concession={CONCESSION}
          onTradeSelected={(trade) => selected.push(trade.label)}
        />,
      );
    });

    const cards = renderer.root.findAll(
      (node) =>
        node.type === "button" && node.props["data-testid"] === "concession-trade-card",
    );

    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.props["data-trade-id"])).toEqual([
      "payment_terms",
      "contract_duration",
      "marketing_value",
    ]);
    React.act(() => cards[1].props.onClick());
    expect(selected).toEqual(["Contract duration"]);
    expect(cards[1].props["aria-pressed"]).toBe(true);
  });
});
