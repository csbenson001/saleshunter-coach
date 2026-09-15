import type { HudObjectionCard, HudWhisperCard } from "./inCallNudgeHud";

export const MAX_MANAGER_LIVE_CALLS = 10;
export const MAX_MANAGER_WHISPER_WORDS = 24;
export const MANAGER_WHISPER_DELIVERY_SLA_MS = 500;

const MEDDIC_KEYS: readonly ManagerMeddicPill["key"][] = ["M", "E", "DC", "DP", "I", "C"];

export interface ManagerMeddicPill {
  key: "M" | "E" | "DC" | "DP" | "I" | "C";
  complete: boolean;
}

export interface ManagerLiveCallInput {
  callId: string;
  repId: string;
  repName: string;
  talkTimeRatio: { rep: number; prospect: number } | null;
  activeObjections: readonly HudObjectionCard[];
  meddic: readonly ManagerMeddicPill[];
}

export interface ManagerCallCard extends ManagerLiveCallInput {
  meddicCompletedCount: number;
  meddicTotal: number;
}

export interface ManagerWhisperDispatch extends HudWhisperCard {
  id: string;
  callId: string;
  repId: string;
  message: string;
  sentAtMs: number;
}

export interface ManagerWhisperInput {
  id: string;
  callId: string;
  repId: string;
  message: string;
  sentAtMs: number;
}

export type ManagerWhisperSender = (dispatch: ManagerWhisperDispatch) => Promise<void>;

export interface DealProgressionEvent {
  id: string;
  callId: string;
  stage: string;
  occurredAtMs: number;
}

export interface ManagerWhisperAuditEntry extends ManagerWhisperDispatch {
  progression: readonly DealProgressionEvent[];
}

export function buildManagerCommandCenter(
  calls: readonly ManagerLiveCallInput[],
): readonly ManagerCallCard[] {
  if (calls.length > MAX_MANAGER_LIVE_CALLS) {
    throw new RangeError(
      `Manager command center supports at most ${MAX_MANAGER_LIVE_CALLS} active calls (received ${calls.length}).`,
    );
  }

  return calls.map((call) => {
    const meddic = MEDDIC_KEYS.map((key) => ({
      key,
      complete: call.meddic.find((pill) => pill.key === key)?.complete ?? false,
    }));

    return {
      ...call,
      activeObjections: [...call.activeObjections],
      meddic,
      meddicCompletedCount: meddic.filter((pill) => pill.complete).length,
      meddicTotal: MEDDIC_KEYS.length,
    };
  });
}

export async function dispatchManagerWhisper(
  input: ManagerWhisperInput,
  send: ManagerWhisperSender,
): Promise<ManagerWhisperAuditEntry> {
  const message = input.message.trim();
  const wordCount = message === "" ? 0 : message.split(/\s+/u).length;
  if (wordCount < 1 || wordCount > MAX_MANAGER_WHISPER_WORDS) {
    throw new RangeError(
      `Manager whispers must contain 1-${MAX_MANAGER_WHISPER_WORDS} words (received ${wordCount}).`,
    );
  }

  const dispatch: ManagerWhisperDispatch = { ...input, message };
  await send(dispatch);

  return { ...dispatch, progression: [] };
}

export function recordDealProgression(
  entry: ManagerWhisperAuditEntry,
  event: DealProgressionEvent,
): ManagerWhisperAuditEntry {
  if (event.callId !== entry.callId) {
    throw new Error(`Deal progression event targets ${event.callId}, expected ${entry.callId}.`);
  }

  return {
    ...entry,
    progression: [...entry.progression, event],
  };
}

export function measureManagerWhisperDelivery(
  dispatch: ManagerWhisperDispatch,
  renderedAtMs: number,
): { latencyMs: number; withinSla: boolean } {
  const latencyMs = renderedAtMs - dispatch.sentAtMs;
  return {
    latencyMs,
    withinSla: latencyMs >= 0 && latencyMs <= MANAGER_WHISPER_DELIVERY_SLA_MS,
  };
}
