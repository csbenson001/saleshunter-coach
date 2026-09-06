#!/usr/bin/env node
/**
 * Automated Tough Sales Person Persona Judge Audit
 * Run: node scripts/sales-judge-audit.mjs
 */

import { auditSalesCapability } from "../src/lib/sales/salesJudge.ts";

const TEST_SCENARIOS = [
  {
    featureName: "Feature 1: Real-Time Deal Risk HUD",
    category: "in_call_cue",
    inputContext: "Prospect mentions 3 other vendors are in a trial bake-off and VP has not approved budget.",
    solutionOutput: "Risk: Unbudgeted 3-way vendor bake-off. Ask: What specific ROI metric determines who wins the business?",
    dealSizeUsd: 40000,
  },
  {
    featureName: "Feature 2: Live In-Call MEDDIC Matrix",
    category: "qualification",
    inputContext: "Rep has uncovered pain and metrics, but has not identified the economic buyer.",
    solutionOutput: "Missing Economic Buyer decision authority. Ask: Aside from yourself, who on the finance committee approves the budget and signs off on this decision timeline?",
    dealSizeUsd: 60000,
  },
  {
    featureName: "Feature 4: Objection Buster - 'Too Expensive'",
    category: "objection_response",
    inputContext: "Prospect: Your price is 30% higher than what we budgeted.",
    solutionOutput: "If we prove this tool eliminates churn risk on 3 enterprise accounts to protect $120,000 in revenue, does that justify the budget decision to close this quarter?",
    dealSizeUsd: 50000,
  },
  {
    featureName: "Feature 8: Instant CRM Sync Exporter",
    category: "post_call_asset",
    inputContext: "Meeting completed with 3 action items, budget confirmation, and agreed POC timeline.",
    solutionOutput: "CRM Opportunity Note logged with confirmed budget, decision timeline, champion metric ROI, and next step close date.",
    dealSizeUsd: 35000,
  },
  {
    featureName: "Feature 11: Multi-Currency Contract Objection Buster",
    category: "objection_response",
    inputContext: "Buyer: We cannot sign a USD contract due to FX volatility. We need to pay in EUR or GBP with a fixed exchange rate.",
    solutionOutput: "We support multi-currency billing in EUR, GBP, and USD with fixed exchange rate collars to eliminate your FX risk on annual contracts. If we fix the exchange rate and bill in your local currency, can we secure decision sign-off this timeline to close this quarter?",
    dealSizeUsd: 65000,
  },
];

console.log("================================================================================");
console.log("   TOUGH SALES PERSON PERSONA JUDGE: Marcus 'The Closer' Vance AUDIT");
console.log("================================================================================\n");

let passed = 0;
for (const scenario of TEST_SCENARIOS) {
  const result = auditSalesCapability(scenario);
  console.log(`[TARGET] ${scenario.featureName}`);
  console.log(`  Verdict:        ${result.verdict} (${result.overallScore}/100)`);
  console.log(`  Glanceability:  ${result.repUsabilityVerdict}`);
  console.log(`  ROI Multiplier: ${result.dollarRoiMultiplierEstimate}`);
  console.log(`  Critique:       ${result.executiveCritique}`);
  console.log("--------------------------------------------------------------------------------");
  if (result.verdict === "DEAL_CLOSER_CERTIFIED") passed++;
}

console.log(`\nAUDIT SUMMARY: ${passed}/${TEST_SCENARIOS.length} Certified by The Closer.`);
if (passed === TEST_SCENARIOS.length) {
  console.log("STATUS: PASS - Ready for quota-carrying AE battlefield deployment.\n");
  process.exit(0);
} else {
  console.log("STATUS: WARNING - Some features require commercial sharpening.\n");
  process.exit(1);
}
