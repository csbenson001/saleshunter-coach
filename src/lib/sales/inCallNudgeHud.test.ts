import { describe, expect, it } from "vitest";
import {
  HUD_CARD_TIMEOUT_MS,
  IN_CALL_NUDGE_HUD_LABEL,
  inCallHudWindowOptions,
  initialInCallHudState,
  reduceInCallHudState,
} from "./inCallNudgeHud";
import type { HudObjectionCard, InCallHudState } from "./inCallNudgeHud";

const CARD: HudObjectionCard = {
  id: "obj_budget",
  title: "Too expensive / no budget",
  rebuttalScript: "Let's tie the investment to the cost of the missed deal.",
  followUpQuestion: "Which metric does finance need to approve this?",
};

function withCard(state: InCallHudState, nowMs = 1_000): InCallHudState {
  return reduceInCallHudState(state, { type: "objection-card", card: CARD }, nowMs);
}

describe("in-call nudge HUD window contract", () => {
  it("uses a transparent, non-focusing, always-on-top click-through window", () => {
    expect(IN_CALL_NUDGE_HUD_LABEL).toBe("in-call-nudge-hud");
    expect(inCallHudWindowOptions()).toEqual({
      transparent: true,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focus: false,
      clickThrough: true,
    });
  });
});

describe("in-call nudge HUD state", () => {
  it("starts empty and updates metrics without dropping a visible card", () => {
    const initial = initialInCallHudState();
    expect(initial).toEqual({
      objectionCount: 0,
      talkTimeRatio: null,
      card: null,
      cardExpiresAtMs: null,
    });

    const visible = withCard(initial);
    const next = reduceInCallHudState(
      visible,
      { type: "metrics", objectionCount: 3, talkTimeRatio: { me: 0.4, them: 0.6 } },
      2_000,
    );

    expect(next.objectionCount).toBe(3);
    expect(next.talkTimeRatio).toEqual({ me: 0.4, them: 0.6 });
    expect(next.card).toEqual(CARD);
    expect(next.cardExpiresAtMs).toBe(1_000 + HUD_CARD_TIMEOUT_MS);
  });

  it("shows one emitted card and gives it a twelve-second deadline", () => {
    const next = withCard(initialInCallHudState(), 20_000);

    expect(next.card).toEqual(CARD);
    expect(next.cardExpiresAtMs).toBe(20_000 + 12_000);
  });

  it("replaces a card and resets its deadline instead of stacking cards", () => {
    const replacement = { ...CARD, id: "obj_competitor", title: "Already use a competitor" };
    const state = withCard(initialInCallHudState(), 1_000);
    const next = reduceInCallHudState(
      state,
      { type: "objection-card", card: replacement },
      5_000,
    );

    expect(next.card).toEqual(replacement);
    expect(next.cardExpiresAtMs).toBe(5_000 + HUD_CARD_TIMEOUT_MS);
  });

  it("keeps a card before the deadline and auto-clears it at the deadline", () => {
    const state = withCard(initialInCallHudState(), 10_000);
    const before = reduceInCallHudState(state, { type: "tick" }, 21_999);
    expect(before.card).toEqual(CARD);

    const expired = reduceInCallHudState(state, { type: "tick" }, 22_000);
    expect(expired.card).toBeNull();
    expect(expired.cardExpiresAtMs).toBeNull();
  });

  it("dismisses immediately and stays dismissed on later ticks", () => {
    const state = withCard(initialInCallHudState());
    const dismissed = reduceInCallHudState(state, { type: "dismiss-card" }, 1_001);
    expect(dismissed.card).toBeNull();
    expect(dismissed.cardExpiresAtMs).toBeNull();

    expect(reduceInCallHudState(dismissed, { type: "tick" }, 50_000)).toEqual(dismissed);
  });
});
