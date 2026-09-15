import { describe, expect, it } from "vitest";
import type { HudWhisperCard } from "./inCallNudgeHud";
import { managerWhisperTargetsSeat } from "./inCallNudgeHudBridge";

const TARGETED_WHISPER: HudWhisperCard = {
  id: "manager-1",
  callId: "call-1",
  repId: "rep-1",
  message: "Ask the approval question.",
  sentAtMs: 10_000,
};

describe("manager whisper seat targeting", () => {
  it("accepts only the exact call and rep target when a HUD seat is specified", () => {
    expect(managerWhisperTargetsSeat(TARGETED_WHISPER, { callId: "call-1", repId: "rep-1" })).toBe(true);
    expect(managerWhisperTargetsSeat(TARGETED_WHISPER, { callId: "call-1", repId: "rep-2" })).toBe(false);
    expect(managerWhisperTargetsSeat(TARGETED_WHISPER, { callId: "call-2", repId: "rep-1" })).toBe(false);
  });

  it("rejects legacy un-targeted envelopes for a seat-specific HUD", () => {
    expect(
      managerWhisperTargetsSeat(
        { id: "legacy", message: "Do this." },
        { callId: "call-1", repId: "rep-1" },
      ),
    ).toBe(false);
  });
});
