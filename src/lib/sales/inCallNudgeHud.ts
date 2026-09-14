export const HUD_CARD_TIMEOUT_MS = 12_000;
export const IN_CALL_NUDGE_HUD_LABEL = "in-call-nudge-hud";

export interface HudTalkTimeRatio {
  me: number;
  them: number;
}

export interface HudObjectionCard {
  id: string;
  title: string;
  rebuttalScript: string;
  followUpQuestion: string;
}

export interface InCallHudState {
  objectionCount: number;
  talkTimeRatio: HudTalkTimeRatio | null;
  card: HudObjectionCard | null;
  cardExpiresAtMs: number | null;
}

export type InCallHudEvent =
  | { type: "metrics"; objectionCount: number; talkTimeRatio: HudTalkTimeRatio | null }
  | { type: "objection-card"; card: HudObjectionCard }
  | { type: "dismiss-card" }
  | { type: "tick" };

export interface InCallHudWindowOptions {
  transparent: true;
  decorations: false;
  alwaysOnTop: true;
  skipTaskbar: true;
  resizable: false;
  focus: false;
  clickThrough: true;
}

export function initialInCallHudState(): InCallHudState {
  return {
    objectionCount: 0,
    talkTimeRatio: null,
    card: null,
    cardExpiresAtMs: null,
  };
}

export function reduceInCallHudState(
  state: InCallHudState,
  event: InCallHudEvent,
  nowMs: number,
): InCallHudState {
  switch (event.type) {
    case "metrics":
      return {
        ...state,
        objectionCount: event.objectionCount,
        talkTimeRatio: event.talkTimeRatio,
      };
    case "objection-card":
      return {
        ...state,
        card: event.card,
        cardExpiresAtMs: nowMs + HUD_CARD_TIMEOUT_MS,
      };
    case "dismiss-card":
      return {
        ...state,
        card: null,
        cardExpiresAtMs: null,
      };
    case "tick":
      if (state.cardExpiresAtMs !== null && nowMs >= state.cardExpiresAtMs) {
        return {
          ...state,
          card: null,
          cardExpiresAtMs: null,
        };
      }
      return state;
  }
}

export function inCallHudWindowOptions(): InCallHudWindowOptions {
  return {
    transparent: true,
    decorations: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focus: false,
    clickThrough: true,
  };
}
