import type { TranscriptSegment } from "../types";

/**
 * SalesHunter CRM Export Connectors
 *
 * Formats transcript summaries and meeting insights for:
 * 1. Salesforce Activity History / Task Notes
 * 2. HubSpot CRM Deal Notes
 * 3. Notion Meeting Database Markdown
 * 4. Generic JSON Webhook Payload (Zapier / Make / Webhooks)
 */

export interface MeetingExportData {
  title: string;
  date: string;
  durationFormatted: string;
  dealHealthScore: number;
  executiveSummary: string[];
  actionItems: string[];
  meddicStatus: Record<string, boolean>;
  prospectName?: string;
  companyName?: string;
  attributedBetId?: string;
  concessionDefendedUsd?: number;
  closedWonArrUsd?: number;
  /** Structured post-call intelligence for CRM API exports. */
  transcript?: string | TranscriptSegment[];
  transcriptText?: string;
  transcriptSegments?: TranscriptSegment[];
  closerScorecard?: CloserScorecard;
  scorecard?: CloserScorecard;
  dealTrajectory?: DealTrajectory;
  followUps?: string[];
  amountUsd?: number;
  opportunityId?: string;
  salesforceStage?: string;
  hubspotDealStage?: string;
  hubspotPipeline?: string;
  hubspotDealId?: string;
}

/** Optional post-call intelligence accepted by the structured CRM exporter. */
export type CrmExportData = MeetingExportData;

export interface CloserScorecard {
  overallGrade?: string;
  grade?: string;
  numericScore?: number;
  score?: number;
  repTalkPercent?: number;
  customerTalkPercent?: number;
  coachingTips?: string[];
}

export interface DealTrajectory {
  initialScore?: number;
  finalScore?: number;
  initialHealthScore?: number;
  finalHealthScore?: number;
  velocity?: "ACCELERATING" | "STABLE" | "AT_RISK" | "DEAD_IN_WATER";
}

export interface SalesforceOpportunityRecord {
  Name: string;
  StageName: string;
  CloseDate: string;
  Amount?: number;
  Description: string;
}

export interface SalesforceTaskRecord {
  Subject: string;
  Status: "Not Started";
  Priority: "Normal";
  ActivityDate: string;
  Description: string;
  WhatId?: string;
}

export interface SalesforceExportPayload {
  opportunity: SalesforceOpportunityRecord;
  task: SalesforceTaskRecord;
}

export interface HubSpotDealPayload {
  properties: {
    dealname: string;
    dealstage: string;
    pipeline: string;
    amount?: string;
    closedate: string;
    description: string;
  };
}

export interface HubSpotNotePayload {
  properties: {
    hs_timestamp: string;
    hs_note_body: string;
  };
  associations?: Array<{
    to: { id: string };
    types: Array<{ associationCategory: "HUBSPOT_DEFINED"; associationTypeId: number }>;
  }>;
}

export interface HubSpotExportPayload {
  deal: HubSpotDealPayload;
  note: HubSpotNotePayload;
}

export interface CrmExportPayloads {
  salesforce: SalesforceExportPayload;
  hubspot: HubSpotExportPayload;
}

const MEDDIC_FIELDS = [
  ["Metrics", "Metrics"],
  ["Economic Buyer", "Economic Buyer"],
  ["Decision Criteria", "Decision Criteria"],
  ["Decision Process", "Decision Process"],
  ["Identify Pain", "Identify Pain"],
  ["Champion", "Champion"],
] as const;

function closeDate(date: string): string {
  const isoDate = date.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoDate) return isoDate;
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? date.slice(0, 10) : new Date(parsed).toISOString().slice(0, 10);
}

function amountOf(data: CrmExportData): number | undefined {
  const amount = data.amountUsd ?? data.closedWonArrUsd;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : undefined;
}

function transcriptOf(data: CrmExportData): string {
  if (data.transcriptText?.trim()) return data.transcriptText.trim();
  const transcript = data.transcriptSegments ?? (Array.isArray(data.transcript) ? data.transcript : undefined);
  if (transcript) {
    return transcript.map((segment) => `${segment.source}: ${segment.text}`).join("\n").trim() || "Not provided";
  }
  return typeof data.transcript === "string" && data.transcript.trim() ? data.transcript.trim() : "Not provided";
}

function scorecardNotes(data: CrmExportData): string[] {
  const scorecard = data.closerScorecard ?? data.scorecard;
  const grade = scorecard?.overallGrade ?? scorecard?.grade ?? "Not evaluated";
  const score = scorecard?.numericScore ?? scorecard?.score;
  const scoreText = typeof score === "number" ? ` (${score}/100)` : "";
  const lines = [`Closer Scorecard: ${grade}${scoreText}`];

  if (typeof scorecard?.repTalkPercent === "number" && typeof scorecard.customerTalkPercent === "number") {
    lines.push(`Talk ratio: Rep ${scorecard.repTalkPercent}% / Prospect ${scorecard.customerTalkPercent}%`);
  }
  for (const tip of scorecard?.coachingTips ?? []) lines.push(`Coaching tip: ${tip}`);
  return lines;
}

function qualificationNotes(data: CrmExportData): string[] {
  return [
    "MEDDIC Qualification:",
    ...MEDDIC_FIELDS.map(([key, label]) => `${label}: ${data.meddicStatus[key] ? "Confirmed" : "Pending"}`),
  ];
}

function trajectoryNotes(data: CrmExportData): string[] {
  const trajectory = data.dealTrajectory;
  if (!trajectory) return [`Deal Trajectory: ${data.dealHealthScore}/100`];
  const initial = trajectory.initialScore ?? trajectory.initialHealthScore ?? data.dealHealthScore;
  const final = trajectory.finalScore ?? trajectory.finalHealthScore ?? data.dealHealthScore;
  const velocity = trajectory.velocity ?? inferVelocity(initial, final);
  return [`Deal Trajectory: ${velocity} (${initial} → ${final})`];
}

function inferVelocity(initialScore: number, finalScore: number): DealTrajectory["velocity"] {
  if (finalScore <= 20) return "DEAD_IN_WATER";
  if (finalScore > initialScore) return "ACCELERATING";
  if (finalScore < initialScore) return "AT_RISK";
  return "STABLE";
}

function activityNotes(data: CrmExportData): string {
  const followUps = data.followUps ?? data.actionItems;
  return [
    "=== SALESHUNTER COACH ACTIVITY NOTE ===",
    `Meeting: ${data.title}`,
    `Date: ${closeDate(data.date)} | Duration: ${data.durationFormatted}`,
    `Deal Health: ${data.dealHealthScore}/100`,
    "",
    "Executive Summary:",
    ...data.executiveSummary.map((item) => `- ${item}`),
    "",
    ...scorecardNotes(data),
    "",
    ...qualificationNotes(data),
    "",
    ...trajectoryNotes(data),
    "",
    "Follow-ups:",
    ...followUps.map((item) => `- ${item}`),
    "",
    `Transcript:\n${transcriptOf(data)}`,
  ].join("\n");
}

/** Build Salesforce REST-compatible Opportunity and Task create records. */
export function buildSalesforcePayload(data: CrmExportData): SalesforceExportPayload {
  const notes = activityNotes(data);
  const opportunity: SalesforceOpportunityRecord = {
    Name: data.title,
    StageName: data.salesforceStage ?? "Qualification",
    CloseDate: closeDate(data.date),
    Description: notes,
  };
  const amount = amountOf(data);
  if (amount !== undefined) opportunity.Amount = amount;

  const task: SalesforceTaskRecord = {
    Subject: data.title,
    Status: "Not Started",
    Priority: "Normal",
    ActivityDate: closeDate(data.date),
    Description: notes,
  };
  if (data.opportunityId) task.WhatId = data.opportunityId;
  return { opportunity, task };
}

/** Build HubSpot v3 Deal and Note create payloads. */
export function buildHubSpotPayload(data: CrmExportData): HubSpotExportPayload {
  const notes = activityNotes(data);
  const properties: HubSpotDealPayload["properties"] = {
    dealname: data.title,
    dealstage: data.hubspotDealStage ?? "qualifiedtobuy",
    pipeline: data.hubspotPipeline ?? "default",
    closedate: closeDate(data.date),
    description: notes,
  };
  const amount = amountOf(data);
  if (amount !== undefined) properties.amount = String(amount);

  const note: HubSpotNotePayload = {
    properties: {
      hs_timestamp: closeDate(data.date),
      hs_note_body: notes,
    },
  };
  if (data.hubspotDealId) {
    note.associations = [{
      to: { id: data.hubspotDealId },
      types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 214 }],
    }];
  }
  return { deal: { properties }, note };
}

/** Generate both payloads synchronously; no network or provider work occurs here. */
export function generateCrmExport(data: CrmExportData): CrmExportPayloads {
  return {
    salesforce: buildSalesforcePayload(data),
    hubspot: buildHubSpotPayload(data),
  };
}

export function validateSalesforcePayload(payload: SalesforceExportPayload): boolean {
  const opportunity = payload?.opportunity;
  const task = payload?.task;
  return Boolean(
    opportunity && opportunity.Name && opportunity.StageName && /^\d{4}-\d{2}-\d{2}$/.test(opportunity.CloseDate) &&
      typeof opportunity.Description === "string" &&
      task && task.Subject && task.Status === "Not Started" && task.Priority === "Normal" &&
      /^\d{4}-\d{2}-\d{2}$/.test(task.ActivityDate) && typeof task.Description === "string",
  );
}

export function validateHubSpotPayload(payload: HubSpotExportPayload): boolean {
  const deal = payload?.deal?.properties;
  const note = payload?.note?.properties;
  return Boolean(
    deal && deal.dealname && deal.dealstage && deal.pipeline &&
      /^\d{4}-\d{2}-\d{2}$/.test(deal.closedate) && typeof deal.description === "string" &&
      note && /^\d{4}-\d{2}-\d{2}$/.test(note.hs_timestamp) && typeof note.hs_note_body === "string",
  );
}

export function formatForSalesforce(data: MeetingExportData): string {
  return [
    `=== SALES HUNTER MEETING LOG ===`,
    `Subject: ${data.title}`,
    `Date: ${data.date} | Duration: ${data.durationFormatted}`,
    `Deal Health Score: ${data.dealHealthScore}/100`,
    ``,
    `-- EXECUTIVE SUMMARY --`,
    ...data.executiveSummary.map((b) => `• ${b}`),
    ``,
    `-- NEXT STEPS & ACTION ITEMS --`,
    ...data.actionItems.map((a) => `[ ] ${a}`),
    ``,
    `-- MEDDIC QUALIFICATION --`,
    `Metrics: ${data.meddicStatus.Metrics ? "Verified" : "Pending"}`,
    `Economic Buyer: ${data.meddicStatus["Economic Buyer"] ? "Identified" : "Pending"}`,
    `Decision Criteria: ${data.meddicStatus["Decision Criteria"] ? "Documented" : "Pending"}`,
    `Decision Process: ${data.meddicStatus["Decision Process"] ? "Mapped" : "Pending"}`,
    `Identify Pain: ${data.meddicStatus["Identify Pain"] ? "Validated" : "Pending"}`,
    `Champion: ${data.meddicStatus.Champion ? "Active" : "Pending"}`,
    ``,
    ...scorecardNotes(data),
    ...qualificationNotes(data),
    ...trajectoryNotes(data),
    `Transcript:`,
    transcriptOf(data),
    `Follow-ups:`,
    ...(data.followUps ?? data.actionItems).map((item) => `- ${item}`),
  ].join("\n");
}

export function formatForHubSpot(data: MeetingExportData): string {
  return [
    `<h3>🎯 SalesHunter Call Note: ${data.title}</h3>`,
    `<p><strong>Date:</strong> ${data.date} | <strong>Duration:</strong> ${data.durationFormatted} | <strong>Health Score:</strong> ${data.dealHealthScore}%</p>`,
    `<h4>Key Takeaways</h4>`,
    `<ul>`,
    ...data.executiveSummary.map((b) => `  <li>${b}</li>`),
    `</ul>`,
    `<h4>Action Items</h4>`,
    `<ul>`,
    ...data.actionItems.map((a) => `  <li>${a}</li>`),
    `</ul>`,
    `<h4>Closer Scorecard &amp; Qualification</h4>`,
    `<pre>${activityNotes(data)}</pre>`,
  ].join("\n");
}

export function formatForNotion(data: MeetingExportData): string {
  return [
    `# 🎙️ ${data.title}`,
    ``,
    `> **Date:** ${data.date}  `,
    `> **Duration:** ${data.durationFormatted}  `,
    `> **Deal Health:** \`${data.dealHealthScore}/100\`  `,
    ``,
    `## 📌 Executive Summary`,
    ...data.executiveSummary.map((b) => `- ${b}`),
    ``,
    `## ✅ Action Items`,
    ...data.actionItems.map((a) => `- [ ] ${a}`),
  ].join("\n");
}

export function formatWebhookPayload(data: MeetingExportData): Record<string, unknown> {
  return {
    source: "SalesHunter Coach",
    version: "1.0",
    event: data.closedWonArrUsd ? "deal.closed_won" : "meeting_completed",
    timestamp: new Date().toISOString(),
    attributedBetId: data.attributedBetId || "TASK-100",
    concessionDefendedUsd: data.concessionDefendedUsd,
    closedWonArrUsd: data.closedWonArrUsd,
    meeting: {
      title: data.title,
      date: data.date,
      duration: data.durationFormatted,
      healthScore: data.dealHealthScore,
      summary: data.executiveSummary,
      actionItems: data.actionItems,
      meddic: data.meddicStatus,
      prospect: data.prospectName || "Unknown",
      company: data.companyName || "Unknown",
    },
  };
}

/**
 * Dispatch closed-loop commercial attribution directly to SalesHunter Factory Brains.
 */
export async function sendAttributionToFactory(
  data: MeetingExportData,
  factoryBaseUrl = "http://127.0.0.1:3002"
): Promise<{ success: boolean; message?: string }> {
  try {
    const url = `${factoryBaseUrl}/api/factory/webhook`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "saleshunter-coach",
        event: data.closedWonArrUsd ? "deal.closed_won" : "meeting.completed",
        taskId: data.attributedBetId || "TASK-100",
        closedWonArrUsd: data.closedWonArrUsd,
        concessionDefendedUsd: data.concessionDefendedUsd,
        title: data.title,
        metadata: {
          company: data.companyName,
          healthScore: data.dealHealthScore,
        },
      }),
    });
    if (res.ok) {
      const parsed = (await res.json()) as { message?: string };
      return { success: true, message: parsed.message };
    }
    return { success: false, message: `HTTP ${res.status}` };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
