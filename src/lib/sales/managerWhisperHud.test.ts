import { describe, expect, it } from "vitest";
import {
  HUD_WHISPER_TIMEOUT_MS,
  initialInCallHudState,
  reduceInCallHudState,
} from "./inCallNudgeHud";
import type { HudWhisperCard } from "./inCallNudgeHud";

const WHISPER: HudWhisperCard = {
  id: "manager-1",
  message: "Ask who else needs to approve this.",
  sentAtMs: 10_000,
};

describe("manager whisper HUD seam", () => {
  it("shows a manager whisper and expires it after fifteen seconds", () => {
    const state = reduceInCallHudState(
      initialInCallHudState(),
      { type: "manager-whisper", whisper: WHISPER },
      10_050,
    );

    expect(HUD_WHISPER_TIMEOUT_MS).toBe(15_000);
    expect(state.managerWhisper).toEqual(WHISPER);
    expect(state.managerWhisperExpiresAtMs).toBe(25_050);
    expect(
      reduceInCallHudState(state, { type: "tick" }, 25_049).managerWhisper,
    ).toEqual(WHISPER);
    expect(
      reduceInCallHudState(state, { type: "tick" }, 25_050).managerWhisper,
    ).toBeNull();
  });
});
