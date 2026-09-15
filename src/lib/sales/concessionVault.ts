export type ConcessionPressureIntent =
  | "too_expensive"
  | "discount_request"
  | "budget_relief";

export type ConcessionTradeId =
  | "payment_terms"
  | "contract_duration"
  | "marketing_value";

export interface ConcessionTradeOption {
  id: ConcessionTradeId;
  discountPercent: 5 | 10;
  give: string;
  get: string;
  label: string;
}

export interface ConcessionVaultCue {
  detected: true;
  intent: ConcessionPressureIntent;
  matchedPhrase: string;
  tradeOptions: readonly [
    ConcessionTradeOption,
    ConcessionTradeOption,
    ConcessionTradeOption,
  ];
}

export const CONCESSION_TRADE_OPTIONS = [
  {
    id: "payment_terms",
    discountPercent: 5,
    give: "5% discount",
    get: "Net-15 payment terms",
    label: "Payment terms",
  },
  {
    id: "contract_duration",
    discountPercent: 10,
    give: "10% discount",
    get: "24-month upfront agreement",
    label: "Contract duration",
  },
  {
    id: "marketing_value",
    discountPercent: 5,
    give: "5% discount",
    get: "Quarterly co-marketing case study & reference calls",
    label: "Marketing value",
  },
] as const satisfies readonly [
  ConcessionTradeOption,
  ConcessionTradeOption,
  ConcessionTradeOption,
];

const PRESSURE_PATTERNS: readonly {
  intent: ConcessionPressureIntent;
  pattern: RegExp;
}[] = [
  { intent: "too_expensive", pattern: /\btoo\s+expensive\b/i },
  {
    intent: "discount_request",
    pattern: /\b(?:give\s+(?:us\s+)?\d+%\s+off|\d+%\s+off)\b/i,
  },
  { intent: "budget_relief", pattern: /\bbudget\s+relief\b/i },
];

export function detectConcessionPressure(
  buyerUtterance: string,
): ConcessionVaultCue | null {
  for (const { intent, pattern } of PRESSURE_PATTERNS) {
    const match = pattern.exec(buyerUtterance);
    if (match) {
      return {
        detected: true,
        intent,
        matchedPhrase: match[0],
        tradeOptions: CONCESSION_TRADE_OPTIONS,
      };
    }
  }

  return null;
}
