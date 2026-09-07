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

