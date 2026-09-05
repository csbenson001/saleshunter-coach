import { describe, it, expect } from "vitest";
import {
  formatForSalesforce,
  formatForHubSpot,
  formatForNotion,
  formatWebhookPayload,
  type MeetingExportData,
} from "./crmExport";

describe("crmExport connectors", () => {
  const mockData: MeetingExportData = {
    title: "Enterprise Discovery with Acme Corp",
    date: "2026-09-05",
    durationFormatted: "28m",
    dealHealthScore: 88,
    executiveSummary: [
      "Customer requires real-time objection handling for 40 reps.",
      "CFO approved $79/seat/mo Team tier evaluation.",
    ],
    actionItems: ["Send 7-day trial link", "Schedule security architecture review"],
    meddicStatus: {
      Metrics: true,
      "Economic Buyer": true,
      "Decision Criteria": true,
      "Decision Process": false,
      "Identify Pain": true,
      Champion: true,
    },
  };

  it("formats for Salesforce activity log with header and bullets", () => {
    const text = formatForSalesforce(mockData);
    expect(text).toContain("SALES HUNTER MEETING LOG");
    expect(text).toContain("Subject: Enterprise Discovery with Acme Corp");
    expect(text).toContain("Economic Buyer: Identified");
    expect(text).toContain("Decision Process: Pending");
  });

  it("formats for HubSpot with HTML tags", () => {
    const html = formatForHubSpot(mockData);
    expect(html).toContain("<h3>🎯 SalesHunter Call Note");
    expect(html).toContain("<li>Send 7-day trial link</li>");
  });

  it("formats for Notion with markdown checkboxes", () => {
    const md = formatForNotion(mockData);
    expect(md).toContain("# 🎙️ Enterprise Discovery with Acme Corp");
    expect(md).toContain("- [ ] Send 7-day trial link");
  });

  it("formats standard JSON webhook payload", () => {
    const payload = formatWebhookPayload(mockData);
    expect(payload.source).toBe("SalesHunter Coach");
    expect((payload.meeting as { healthScore: number }).healthScore).toBe(88);
  });
});
