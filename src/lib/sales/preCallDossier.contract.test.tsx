import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PRE_CALL_DOSSIER_LEAD_TIME_MS,
  resolveSalesCallSurface,
  shouldPresentPreCallDossier,
  type PreCallDossier,
} from "./preCallDossier";
import { PreCallDossierCard } from "../../components/sales/PreCallDossierCard";

const callStartAtMs = 1_700_000_000_000;
const dossier: PreCallDossier = {
  economicBuyerBackground: "Maya Chen is Acme's CFO; she owns the ROI and renewal-risk decision.",
  lastMeetingBlocker: "Security review stalled because the data-retention policy was unclear.",
  competitorTraps: [
    "Do not accept the incumbent's lower sticker price as the full cost comparison.",
    "Do not frame the competitor as broken; expose the missing live-coaching workflow.",
  ],
  openingQuestion: "Which business outcome must you protect this quarter for this initiative to earn approval?",
};

function wordCount(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

describe("pre-call intelligence dossier contract", () => {
  it("opens exactly in the 60-second scheduled window or on a manual trigger", () => {
    expect(PRE_CALL_DOSSIER_LEAD_TIME_MS).toBe(60_000);
    expect(
      shouldPresentPreCallDossier({
        nowMs: callStartAtMs - 60_001,
        callStartAtMs,
        manualTrigger: false,
      }),
    ).toBe(false);
    expect(
      shouldPresentPreCallDossier({
        nowMs: callStartAtMs - 60_000,
        callStartAtMs,
        manualTrigger: false,
      }),
    ).toBe(true);
    expect(
      shouldPresentPreCallDossier({
        nowMs: callStartAtMs - 5_000,
        callStartAtMs,
        manualTrigger: true,
      }),
    ).toBe(true);
    expect(
      shouldPresentPreCallDossier({
        nowMs: callStartAtMs,
        callStartAtMs,
        manualTrigger: true,
      }),
    ).toBe(false);
  });

  it("renders the economic buyer, last blocker, competitor traps, and short opening question", () => {
    const html = renderToStaticMarkup(<PreCallDossierCard dossier={dossier} />);

    expect(html).toContain("Economic Buyer");
    expect(html).toContain(dossier.economicBuyerBackground);
    expect(html).toContain("Last Meeting Blocker");
    expect(html).toContain(dossier.lastMeetingBlocker);
    expect(html).toContain("Competitor Traps");
    for (const trap of dossier.competitorTraps) expect(html).toContain(trap);
    expect(html).toContain("Opening Question");
    expect(html).toContain(dossier.openingQuestion);
    expect(wordCount(dossier.openingQuestion)).toBeLessThan(30);
  });

  it("hands a visible dossier to the live HUD when recording begins", () => {
    expect(resolveSalesCallSurface({ meetingStatus: "pre-call", dossierVisible: true })).toBe("pre-call-dossier");
    expect(resolveSalesCallSurface({ meetingStatus: "recording", dossierVisible: true })).toBe("in-call-nudge-hud");
    expect(resolveSalesCallSurface({ meetingStatus: "recording", dossierVisible: false })).toBe("in-call-nudge-hud");
    expect(resolveSalesCallSurface({ meetingStatus: "paused", dossierVisible: true })).toBe("hidden");
    expect(resolveSalesCallSurface({ meetingStatus: "replay", dossierVisible: true })).toBe("hidden");
  });
});
