import { describe, expect, it } from "vitest";
import {
  buildHubSpotPayload,
  buildSalesforcePayload,
  generateCrmExport,
  validateHubSpotPayload,
  validateSalesforcePayload,
  type CrmExportData,
} from "./crmExport";

const data: CrmExportData = {
  title: "Acme enterprise discovery",
  date: "2026-09-14",
  durationFormatted: "28m",
  dealHealthScore: 82,
  executiveSummary: ["Acme needs live coaching for a 40-rep team."],
  actionItems: ["Send the security review packet"],
  meddicStatus: {
    Metrics: true,
    "Economic Buyer": true,
    "Decision Criteria": true,
    "Decision Process": false,
    "Identify Pain": true,
    Champion: false,
  },
  transcript: "Buyer: We need to reduce missed quota before Q4.",
  closerScorecard: {
    overallGrade: "A",
    numericScore: 91,
    coachingTips: ["Keep the prospect talking."],
  },
  dealTrajectory: {
    initialScore: 55,
    finalScore: 82,
    velocity: "ACCELERATING",
  },
  followUps: ["Confirm CFO review on Thursday"],
  amountUsd: 28500,
};

describe("CRM API export contract", () => {
  it("builds standard Salesforce Opportunity and Task records with shared notes", () => {
    const payload = buildSalesforcePayload(data);

    expect(payload.opportunity).toMatchObject({
      Name: "Acme enterprise discovery",
      StageName: "Qualification",
      CloseDate: "2026-09-14",
      Amount: 28500,
    });
    expect(payload.task).toMatchObject({
      Subject: "Acme enterprise discovery",
      Status: "Not Started",
      Priority: "Normal",
      ActivityDate: "2026-09-14",
    });
    expect(payload.opportunity.Description).toContain("Closer Scorecard: A (91/100)");
    expect(payload.task.Description).toContain("MEDDIC Qualification");
    expect(payload.task.Description).toContain("Metrics: Confirmed");
    expect(payload.task.Description).toContain("Deal Trajectory: ACCELERATING (55 → 82)");
    expect(payload.task.Description).toContain("Buyer: We need to reduce missed quota before Q4.");
    expect(validateSalesforcePayload(payload)).toBe(true);
  });

  it("builds a standard HubSpot Deal and activity Note payload", () => {
    const payload = buildHubSpotPayload(data);

    expect(payload.deal).toMatchObject({
      properties: {
        dealname: "Acme enterprise discovery",
        dealstage: "qualifiedtobuy",
        pipeline: "default",
        amount: "28500",
        closedate: "2026-09-14",
      },
    });
    expect(payload.note).toMatchObject({
      properties: { hs_timestamp: "2026-09-14", hs_note_body: expect.any(String) },
    });
    expect(payload.note.properties.hs_note_body).toContain("Closer Scorecard: A (91/100)");
    expect(payload.note.properties.hs_note_body).toContain("Confirm CFO review on Thursday");
    expect(validateHubSpotPayload(payload)).toBe(true);
  });

  it("creates both platform payloads synchronously", () => {
    const started = performance.now();
    const exportResult = generateCrmExport(data);
    const elapsed = performance.now() - started;

    expect(exportResult.salesforce.task.Subject).toBe(data.title);
    expect(exportResult.hubspot.deal.properties.dealname).toBe(data.title);
    expect(elapsed).toBeLessThan(200);
  });
});
