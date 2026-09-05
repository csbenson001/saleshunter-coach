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
    solutionOutput: "Missing: Economic Buyer. Ask: Aside from yourself, who signs off on the purchase order for this project?",
    dealSizeUsd: 60000,
  },
  {
    featureName: "Feature 4: Objection Buster - 'Too Expensive'",
    category: "objection_response",
    inputContext: "Prospect: Your price is 30% higher than what we budgeted.",
    solutionOutput: "If we can prove this protects 3 at-risk customer accounts in 60 days, does the investment justify itself?",
    dealSizeUsd: 50000,
  },
  {
    featureName: "Feature 8: Instant CRM Sync Exporter",
    category: "post_call_asset",
    inputContext: "Meeting completed with 3 action items, budget confirmation, and agreed POC timeline.",
    solutionOutput: "CRM Task & Opportunity Note formatted with Next Step Commitment Date, MEDDIC Score 85%, and Decision Timeline.",
    dealSizeUsd: 35000,
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
