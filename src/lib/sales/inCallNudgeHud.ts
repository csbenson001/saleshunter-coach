export const HUD_CARD_TIMEOUT_MS = 12_000;
export const HUD_WHISPER_TIMEOUT_MS = 15_000;
export const IN_CALL_NUDGE_HUD_LABEL = "in-call-nudge-hud";

export interface HudTalkTimeRatio {
  me: number;
  them: number;
}

export interface HudObjectionCard {
  id: string;
  title: string;
  trap?: string;
  rebuttalScript: string;
  followUpQuestion: string;
  tradeOptions?: string[];
}

/** A short, non-interrupting instruction sent by a manager during a call. */
export interface HudWhisperCard {
  id: string;
  /** Target metadata is additive so older HUD clients can still render the card. */
  callId?: string;
  repId?: string;
  /** `prompt` is accepted for dashboard clients that use the manager vocabulary. */
  message?: string;
  prompt?: string;
  /** Timestamp from the manager submit boundary, used for the delivery SLA. */
  sentAtMs?: number;
}

export interface HudWhisperSeat {
  callId: string;
  repId: string;
}

export interface InCallHudState {
  objectionCount: number;
  talkTimeRatio: HudTalkTimeRatio | null;
  card: HudObjectionCard | null;
  cardExpiresAtMs: number | null;
  managerWhisper?: HudWhisperCard | null;
  managerWhisperExpiresAtMs?: number | null;
}

export interface HudCardEmission {
  id: number;
  cardId: string;
  emittedAtMs: number;
}

export type InCallHudEvent =
  | { type: "metrics"; objectionCount: number; talkTimeRatio: HudTalkTimeRatio | null }
  | { type: "objection-card"; card: HudObjectionCard }
  | { type: "manager-whisper"; whisper: HudWhisperCard }
  | { type: "dismiss-card" }
  | { type: "dismiss-whisper" }
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

/** The HUD is a live-call surface, never a paused/replay/stopped surface. */
export function shouldShowInCallNudgeHud(meetingStatus: string): boolean {
  return meetingStatus === "recording";
}

/** Keep the native surface pass-through unless its dismiss affordance exists. */
export function hudShouldIgnoreCursorEvents(state: InCallHudState): boolean {
  return state.card === null;
}

/** Card ids are not unique across repeated objection matches; emissions are. */
export function createInCallHudCardEmission(
  previousId: number | null,
  cardId: string,
  emittedAtMs: number,
): HudCardEmission {
  return { id: (previousId ?? 0) + 1, cardId, emittedAtMs };
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
    case "manager-whisper":
      return {
        ...state,
        managerWhisper: event.whisper,
        managerWhisperExpiresAtMs: nowMs + HUD_WHISPER_TIMEOUT_MS,
      };
    case "dismiss-card":
      return {
        ...state,
        card: null,
        cardExpiresAtMs: null,
      };
    case "dismiss-whisper":
      return {
        ...state,
        managerWhisper: null,
        managerWhisperExpiresAtMs: null,
      };
    case "tick":
      {
        const whisperExpired = state.managerWhisperExpiresAtMs != null && nowMs >= state.managerWhisperExpiresAtMs;
        const cardExpired = state.cardExpiresAtMs !== null && nowMs >= state.cardExpiresAtMs;
        if (!whisperExpired && !cardExpired) return state;
        return {
          ...state,
          ...(whisperExpired ? { managerWhisper: null, managerWhisperExpiresAtMs: null } : {}),
          ...(cardExpired ? { card: null, cardExpiresAtMs: null } : {}),
        };
      }
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
