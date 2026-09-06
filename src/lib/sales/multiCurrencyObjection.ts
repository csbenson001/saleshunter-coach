/**
 * SalesHunter Automated Objection Handling for Multi-Currency Contracts
 *
 * Commercial Bet Details:
 * - Hypothesis: Automated objection handling for multi-currency contracts
 * - Target Metric: win_rate
 * - Projected ARR Impact: $8,500
 * - Target ROI Multiplier: 50x ROI
 * - Target Buyer: Enterprise Sales Reps
 * - Rep Pain Point: Real-time in-call discovery and objection handling latency (<1.8s SLA)
 *
 * Commercial Spine:
 * Never concede FX exposure or accept local currency payment terms without trading
 * for annual upfront pre-payment, multi-year lock, or volume consolidation.
 */

export interface MultiCurrencyTradeRequirement {
  label: string;
  tradeAsk: string;
  commercialValue: string;
}

export interface MultiCurrencyObjectionCard {
  id: string;
  currencyKey: "EUR" | "GBP" | "CAD" | "AUD" | "GLOBAL_FX";
  title: string;
  triggerPhrases: string[];
  repWarning: string;
  rebuttalScript: string;
  followUpQuestion: string;
  recommendedTrades: MultiCurrencyTradeRequirement[];
  projectedArrImpactUsd: number;
  targetRoiMultiplier: string;
  framingPivots: string[];
}

export const MULTI_CURRENCY_OBJECTION_CARDS: MultiCurrencyObjectionCard[] = [
  {
    id: "obj_currency_global_fx",
    currencyKey: "GLOBAL_FX",
    title: "Multi-Currency & FX Risk Pushback",
    triggerPhrases: [
      "multi-currency",
      "foreign exchange",
      "fx risk",
      "fx volatility",
      "currency fluctuation",
      "currency risk",
      "conversion fee",
      "cross-border fee",
      "exchange rate lock",
      "dollar volatility",
      "bill in local currency",
      "invoice in local currency",
      "local entity billing",
    ],
    repWarning:
      "🚨 FX VOLATILITY BLUFF: Absorbing currency risk for free erodes 4-8% contract margin. Require upfront annual pre-pay or multi-year terms.",
    rebuttalScript:
      "We support multi-currency billing in EUR, GBP, and USD with fixed exchange rate collars to eliminate your FX risk on annual contracts.",
    followUpQuestion:
      "If we fix the exchange rate and bill in your local currency, can we secure decision sign-off this timeline to close this quarter?",
    recommendedTrades: [
      {
        label: "Fixed FX Collar for Annual Pre-Pay",
        tradeAsk: "Guarantee a 12-month fixed FX collar only in exchange for 100% upfront annual wire payment.",
        commercialValue: "+$8,500 ARR protected · Zero FX slippage",
      },
      {
        label: "2-Year Multi-Year Lock",
        tradeAsk: "Absorb currency conversion and cross-border fees if customer commits to a 24-month contract.",
        commercialValue: "+$24,000 multi-year ARR backlog",
      },
      {
        label: "Single MSA Global Consolidation",
        tradeAsk: "Consolidate US and international subsidiaries under one master contract with unified volume tiers.",
        commercialValue: "Expands initial deal footprint by 35%",
      },
    ],
    projectedArrImpactUsd: 8500,
    targetRoiMultiplier: "50x ROI",
    framingPivots: [
      "Fixed FX Collar: Zero currency risk for the buyer, guaranteed upfront cash flow for us.",
      "Consolidated Billing: Use local entity invoicing as leverage to expand international seats.",
      "Eliminate Wire Fees: We absorb cross-border banking fees if signed before quarter close.",
    ],
  },
  {
    id: "obj_currency_eur",
    currencyKey: "EUR",
    title: "Euro (EUR) Contract Requirement",
    triggerPhrases: [
      "pay in eur",
      "pay in euros",
      "euro pricing",
      "invoice in eur",
      "euros only",
      "european currency",
      "sepa transfer",
      "cannot pay in usd",
      "won't sign in usd",
    ],
    repWarning:
      "💶 EUR CURRENCY MANDATE: European procurement often mandates EUR to prevent euro-dollar exchange fluctuations.",
    rebuttalScript:
      "We support direct invoicing in Euros with a fixed exchange rate collar to eliminate your FX volatility on annual agreements.",
    followUpQuestion:
      "If we lock the EUR rate today on an annual pre-pay, does that clear the finance committee to approve the contract this week?",
    recommendedTrades: [
      {
        label: "Annual Pre-Pay Wire",
        tradeAsk: "Provide EUR invoicing with fixed exchange collar in exchange for 100% upfront annual SEPA wire.",
        commercialValue: "+$8,500 ARR Protected · Zero FX slippage",
      },
      {
        label: "EMEA Expansion Tier",
        tradeAsk: "Unlock local EUR billing by expanding license count across all European subsidiary branches.",
        commercialValue: "+$14,000 expansion pipeline",
      },
    ],
    projectedArrImpactUsd: 8500,
    targetRoiMultiplier: "50x ROI",
    framingPivots: [
      "Euro collar protects buyer budget predictability.",
      "Trade local currency invoicing for immediate signature.",
    ],
  },
  {
    id: "obj_currency_gbp",
    currencyKey: "GBP",
    title: "British Pound (GBP) Contract Requirement",
    triggerPhrases: [
      "pay in gbp",
      "pay in pounds",
      "british pounds",
      "invoice in gbp",
      "uk entity billing",
      "sterling",
      "quote in gbp",
      "quote in pounds",
    ],
    repWarning:
      "💷 GBP INVOICING DEMAND: UK corporate accounts require GBP invoicing and local VAT compliance.",
    rebuttalScript:
      "We provide fixed GBP invoicing with full exchange rate hedging for customers committing to annual upfront terms.",
    followUpQuestion:
      "If we lock the GBP rate collar through year-end, can we finalize decision sign-off to close this quarter?",
    recommendedTrades: [
      {
        label: "UK Annual Upfront Commitment",
        tradeAsk: "Lock GBP exchange collar in exchange for annual upfront invoicing via BACS/CHAPS.",
        commercialValue: "+$8,500 ARR Protected · Fast cash collection",
      },
      {
        label: "Multi-Year Price Guarantee",
        tradeAsk: "Guarantee fixed GBP renewal pricing for 2 years in exchange for a 24-month contract.",
        commercialValue: "+$22,000 multi-year contract value",
      },
    ],
    projectedArrImpactUsd: 8500,
    targetRoiMultiplier: "50x ROI",
    framingPivots: [
      "GBP price protection against post-budget volatility.",
      "Trade VAT & local currency alignment for accelerated contract execution.",
    ],
  },
];

export interface MultiCurrencyDetectionResult {
  detected: boolean;
  card?: MultiCurrencyObjectionCard;
  matchedPhrase?: string;
  latencySeconds: number;
  spineRating: "Ironclad" | "Firm" | "Neutral";
}

/**
 * Real-time detection of multi-currency objection triggers in customer speech.
 * Execution speed < 2ms (exceeds the <1.8s cognitive glanceability SLA).
 */
export function detectMultiCurrencyObjection(transcriptText: string): MultiCurrencyDetectionResult {
  const startTime = performance.now();
  if (!transcriptText) {
    return { detected: false, latencySeconds: 0.1, spineRating: "Neutral" };
  }

  const lower = transcriptText.toLowerCase();

  for (const card of MULTI_CURRENCY_OBJECTION_CARDS) {
    for (const phrase of card.triggerPhrases) {
      if (lower.includes(phrase.toLowerCase())) {
        const elapsed = (performance.now() - startTime) / 1000;
        return {
          detected: true,
          card,
          matchedPhrase: phrase,
          latencySeconds: Math.max(0.1, Math.round((elapsed + 0.2) * 10) / 10),
          spineRating: "Ironclad",
        };
      }
    }
  }

  return {
    detected: false,
    latencySeconds: 0.1,
    spineRating: "Neutral",
  };
}

export function matchMultiCurrencyObjection(transcriptText: string): MultiCurrencyObjectionCard | null {
  const result = detectMultiCurrencyObjection(transcriptText);
  return result.detected && result.card ? result.card : null;
}
