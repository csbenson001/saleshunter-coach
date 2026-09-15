import type { HudObjectionCard, HudWhisperCard } from "./inCallNudgeHud";

export const MAX_MANAGER_LIVE_CALLS = 10;
export const MAX_MANAGER_WHISPER_WORDS = 24;
export const MANAGER_WHISPER_DELIVERY_SLA_MS = 500;

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

/** SAL-19 contract stub: the builder owns the implementation. */
export function buildManagerCommandCenter(
  _calls: readonly ManagerLiveCallInput[],
): readonly ManagerCallCard[] {
  throw new Error("SAL-19 manager command center is not implemented");
}

/** SAL-19 contract stub: the builder owns the implementation. */
export async function dispatchManagerWhisper(
  _input: ManagerWhisperInput,
  _send: ManagerWhisperSender,
): Promise<ManagerWhisperAuditEntry> {
  throw new Error("SAL-19 manager whisper dispatch is not implemented");
}

/** SAL-19 contract stub: the builder owns the implementation. */
export function recordDealProgression(
  _entry: ManagerWhisperAuditEntry,
  _event: DealProgressionEvent,
): ManagerWhisperAuditEntry {
  throw new Error("SAL-19 deal progression audit is not implemented");
}

/** SAL-19 contract stub: the builder owns the implementation. */
export function measureManagerWhisperDelivery(
  _dispatch: ManagerWhisperDispatch,
  _renderedAtMs: number,
): { latencyMs: number; withinSla: boolean } {
  throw new Error("SAL-19 manager whisper delivery measurement is not implemented");
}
