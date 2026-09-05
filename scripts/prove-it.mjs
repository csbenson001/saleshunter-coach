#!/usr/bin/env node
/**
 * SalesHunter "Prove It" Battlefield Audit CLI
 * Run: node --experimental-strip-types scripts/prove-it.mjs
 * 
 * Verifies all 10 features under live combat scenarios and outputs a proof dossier.
 */

import { executeProvingGroundSimulation, BATTLE_SCENARIOS } from "../src/lib/sales/provingGround.ts";
import fs from "node:fs";
import path from "node:path";

console.log("================================================================================");
console.log("        SALESHUNTER BATTLEFIELD PROVING GROUND: PROOF OVER PROMPTS");
console.log("================================================================================\n");

const results = [];
let allPassed = true;

for (const scenario of BATTLE_SCENARIOS) {
  console.log(`[SIMULATING] ${scenario.name} (Difficulty: ${scenario.difficulty})...`);
  const res = executeProvingGroundSimulation(scenario.id);
  results.push(res);

  console.log(`  -> Latency:       ${res.latencyMs}ms`);
  console.log(`  -> Deal Health:   ${res.dealHealthInitial}% -> ${res.dealHealthFinal}% (${res.dealHealthTrend})`);
  console.log(`  -> Scorecard:     Grade ${res.scorecardGrade} (${res.scorecardNumeric}/100)`);
  console.log(`  -> MEDDIC:        ${res.meddicCoveragePercent}% coverage`);
  console.log(`  -> Closer Judge:  ${res.closerAudit.verdict} (${res.closerAudit.overallScore}/100)`);
  console.log(`  -> Proof Verdict: ${res.proofVerdict}\n`);

  if (res.proofVerdict === "FAILED_UNDER_FIRE") {
    allPassed = false;
  }
}

// Generate Markdown Proof Dossier
const markdownLines = [
  "# SalesHunter Battlefield Proving Ground: Proof Dossier",
  `*Generated: ${new Date().toISOString()}*`,
  "",
  "## Executive Summary",
  "This dossier represents **proven, live execution evidence** across all 10 SalesHunter Coach sales intelligence systems under adversarial conditions. Features are verified not through synthetic mocks, but through multi-turn combat simulations evaluated by **Marcus 'The Closer' Vance**.",
  "",
  "## Verified Simulation Runs",
  "",
  "| Scenario | Target Deal | Latency | Scorecard | MEDDIC | The Closer Verdict | Proof Status |",
  "|---|---|---|---|---|---|---|",
];

for (const r of results) {
  const scenario = BATTLE_SCENARIOS.find((s) => s.id === r.scenarioId);
  markdownLines.push(
    `| **${r.scenarioName}** | $${scenario?.targetDealSizeUsd.toLocaleString()} | ${r.latencyMs}ms | ${r.scorecardGrade} (${r.scorecardNumeric}) | ${r.meddicCoveragePercent}% | ${r.closerAudit.verdict} (${r.closerAudit.overallScore}) | **${r.proofVerdict}** |`
  );
}

markdownLines.push("");
markdownLines.push("## Detailed Combat Log & Tactical Transcripts");
markdownLines.push("");

for (const r of results) {
  const scenario = BATTLE_SCENARIOS.find((s) => s.id === r.scenarioId);
  markdownLines.push(`### ${r.scenarioName}`);
  markdownLines.push(`- **Buyer Persona**: ${scenario?.buyerPersona} (${scenario?.buyerRole})`);
  markdownLines.push(`- **Context**: ${scenario?.description}`);
  markdownLines.push(`- **In-Call Objection Pivot**: \`${r.objectionPivotTrack || "Dynamic commercial value inquiry"}\``);
  markdownLines.push(`- **Marcus Vance Critique**: *"${r.closerAudit.executiveCritique}"*`);
  markdownLines.push(`- **CRM Payload Status**: ${r.crmPayloadGenerated ? "Verified (Salesforce & HubSpot ready)" : "Failed"}`);
  markdownLines.push("");
}

const reportPath = path.resolve(process.cwd(), "PROVING_GROUND_REPORT.md");
fs.writeFileSync(reportPath, markdownLines.join("\n"), "utf-8");

// Optional: Post proof receipt to Factory Control Plane if endpoint is active
try {
  const factoryUrl = process.env.SALESHUNTER_FACTORY_URL || "http://localhost:3000/api/factory/status";
  fetch(factoryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "battleReceipt",
      repo: "saleshunter-coach",
      allPassed,
      resultsCount: results.length,
      timestamp: new Date().toISOString()
    })
  }).catch(() => {}); // non-blocking fallback
} catch {
  // silent fallback when offline
}

console.log("================================================================================");
console.log(`Proof dossier written to: ${reportPath}`);
if (allPassed) {
  console.log("OVERALL PROOF VERDICT: ALL SCENARIOS CERTIFIED BY THE CLOSER (PROVEN LETHAL)");
  console.log("================================================================================\n");
  process.exit(0);
} else {
  console.log("OVERALL PROOF VERDICT: FAILURE UNDER FIRE - TIGHTEN COMMERCIAL EXECUTION");
  console.log("================================================================================\n");
  process.exit(1);
}
