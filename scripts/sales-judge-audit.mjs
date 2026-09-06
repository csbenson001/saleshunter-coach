#!/usr/bin/env node
/**
 * Automated Tough Sales Person Persona Judge Audit
 * Run: node scripts/sales-judge-audit.mjs
 */

import { auditSalesCapability } from "../src/lib/sales/salesJudge.ts";
import { translate } from "../src/i18n/messages.ts";

const TEST_SCENARIOS = [
  {
    id: "deal-risk-hud",
    featureName: "Feature 1: Real-Time Deal Risk HUD",
    category: "in_call_cue",
    inputContext: "Prospect mentions 3 other vendors are in a trial bake-off and VP has not approved budget.",
    solutionOutput: "Risk: Unbudgeted 3-way vendor bake-off. Ask: What specific ROI metric determines who wins the business?",
    dealSizeUsd: 40000,
  },
  {
    id: "meddic-matrix",
    featureName: "Feature 2: Live In-Call MEDDIC Matrix",
    category: "qualification",
    inputContext: "Rep has uncovered pain and metrics, but has not identified the economic buyer.",
    solutionOutput: "Missing: Economic Buyer. Ask: Aside from yourself, who signs off on the purchase order for this project?",
    dealSizeUsd: 60000,
  },
  {
    id: "budget-objection",
    featureName: "Feature 4: Objection Buster - 'Too Expensive'",
    category: "objection_response",
    inputContext: "Prospect: Your price is 30% higher than what we budgeted.",
    solutionOutput: "If we can prove this protects 3 at-risk customer accounts in 60 days, does the investment justify itself?",
    dealSizeUsd: 50000,
  },
  {
    id: "gong-coexistence",
    featureName: "Gong Incumbent Coexistence Defense",
    category: "objection_response",
    inputContext: "VP RevOps says Gong is already deployed across 200 reps and rejects a rip-and-replace evaluation.",
    solutionOutput: `${translate("en", "coexistence.positioning")} ${translate("en", "coexistence.question")}`,
    targetBuyerPersona: "VP Sales Operations & RevOps Directors",
    dealSizeUsd: 8000,
  },
  {
    id: "crm-exporter",
    featureName: "Feature 8: Instant CRM Sync Exporter",
    category: "post_call_asset",
    inputContext: "Meeting completed with 3 action items, budget confirmation, and agreed POC timeline.",
    solutionOutput: "CRM Task & Opportunity Note formatted with Next Step Commitment Date, MEDDIC Score 85%, and Decision Timeline.",
    dealSizeUsd: 35000,
  },
];

const featureFlagIndex = process.argv.indexOf("--feature");
const requestedFeature = featureFlagIndex >= 0 ? process.argv[featureFlagIndex + 1] : null;
const scenarios = requestedFeature
  ? TEST_SCENARIOS.filter((scenario) => scenario.id === requestedFeature)
  : TEST_SCENARIOS;

if (requestedFeature && scenarios.length === 0) {
  console.error(`Unknown sales audit feature: ${requestedFeature}`);
  process.exit(2);
}

console.log("================================================================================");
console.log("   TOUGH SALES PERSON PERSONA JUDGE: Marcus 'The Closer' Vance AUDIT");
console.log("================================================================================\n");

let passed = 0;
for (const scenario of scenarios) {
  const result = auditSalesCapability(scenario);
  console.log(`[TARGET] ${scenario.featureName}`);
  console.log(`  Verdict:        ${result.verdict} (${result.overallScore}/100)`);
  console.log(`  Glanceability:  ${result.repUsabilityVerdict}`);
  console.log(`  ROI Multiplier: ${result.dollarRoiMultiplierEstimate}`);
  console.log(`  Critique:       ${result.executiveCritique}`);
  console.log("--------------------------------------------------------------------------------");
  if (result.verdict === "DEAL_CLOSER_CERTIFIED") passed++;
}

console.log(`\nAUDIT SUMMARY: ${passed}/${scenarios.length} Certified by The Closer.`);
if (passed === scenarios.length) {
  console.log("STATUS: PASS - Ready for quota-carrying AE battlefield deployment.\n");
  process.exit(0);
} else {
  console.log("STATUS: WARNING - Some features require commercial sharpening.\n");
  process.exit(1);
}
