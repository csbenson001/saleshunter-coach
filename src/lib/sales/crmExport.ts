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
    event: "meeting_completed",
    timestamp: new Date().toISOString(),
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
