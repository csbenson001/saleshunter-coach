/** The dossier becomes useful one minute before a scheduled call begins. */
export const PRE_CALL_DOSSIER_LEAD_TIME_MS = 60_000 as const;

export type PreCallDossier = {
  economicBuyerBackground: string;
  lastMeetingBlocker: string;
  competitorTraps: string[];
  openingQuestion: string;
};

/**
 * Decide whether a dossier may be shown for the current call.
 *
 * A manual trigger can open the dossier early, but never after the call has
 * started. The caller owns de-duplication so this function stays stateless.
 */
export function shouldPresentPreCallDossier(input: {
  nowMs: number;
  callStartAtMs: number | null;
  manualTrigger: boolean;
}): boolean {
  const { nowMs, callStartAtMs, manualTrigger } = input;
  if (callStartAtMs == null || nowMs >= callStartAtMs) return false;
  return manualTrigger || nowMs >= callStartAtMs - PRE_CALL_DOSSIER_LEAD_TIME_MS;
}

/** Resolve the one visible sales surface for the current lifecycle state. */
export function resolveSalesCallSurface(input: {
  meetingStatus: "idle" | "pre-call" | "recording" | "paused" | "stopped" | "replay";
  dossierVisible: boolean;
}): "hidden" | "pre-call-dossier" | "in-call-nudge-hud" {
  if (input.meetingStatus === "recording") return "in-call-nudge-hud";
  if (input.meetingStatus === "pre-call" && input.dossierVisible) return "pre-call-dossier";
  return "hidden";
}
