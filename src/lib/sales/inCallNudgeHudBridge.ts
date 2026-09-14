import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauri } from "../tauriEvents";
import { log } from "../log";
import {
  IN_CALL_NUDGE_HUD_LABEL,
  hudShouldIgnoreCursorEvents,
  inCallHudWindowOptions,
  type InCallHudState,
} from "./inCallNudgeHud";

export const IN_CALL_HUD_STATE_EVENT = "in-call-nudge-hud://state";
export const IN_CALL_HUD_HELLO_EVENT = "in-call-nudge-hud://hello";
export const IN_CALL_HUD_DISMISS_EVENT = "in-call-nudge-hud://dismiss";

export interface InCallHudStateMessage {
  state: InCallHudState;
  emittedAtMs: number;
  cardEmissionId: number | null;
  cardEmittedAtMs: number | null;
}

const WIDTH = 360;
const HEIGHT = 260;

let creating: Promise<void> | null = null;

/** Create the HUD only when the caller has confirmed that a meeting is recording. */
export async function ensureInCallNudgeHudWindow(): Promise<void> {
  if (!isTauri()) return;
  if (creating) return creating;

  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const existing = await WebviewWindow.getByLabel(IN_CALL_NUDGE_HUD_LABEL);
  if (existing) {
    await existing.show();
    await existing.setIgnoreCursorEvents(true);
    return;
  }

  creating = (async () => {
    const { clickThrough: _clickThrough, ...windowOptions } = inCallHudWindowOptions();
    const win = new WebviewWindow(IN_CALL_NUDGE_HUD_LABEL, {
      url: "index.html#in-call-nudge-hud",
      title: "SalesHunter Coach — In-call nudge",
      width: WIDTH,
      height: HEIGHT,
      minWidth: WIDTH,
      minHeight: 120,
      maxWidth: WIDTH,
      maxHeight: HEIGHT,
      shadow: false,
      visible: true,
      ...windowOptions,
    });
    await new Promise<void>((resolve) => {
      win.once("tauri://created", () => resolve());
      win.once("tauri://error", (event) => {
        log.error("in-call-nudge-hud: window error", { error: String(event) });
        resolve();
      });
    });
    await win.setIgnoreCursorEvents(true);
  })();

  try {
    await creating;
  } finally {
    creating = null;
  }
}

/** Toggle native hit testing only while a dismissible card is visible. */
export async function setInCallNudgeHudInteractive(interactive: boolean): Promise<void> {
  if (!isTauri()) return;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const win = await WebviewWindow.getByLabel(IN_CALL_NUDGE_HUD_LABEL);
  if (win) await win.setIgnoreCursorEvents(!interactive);
}

/** End the HUD lifecycle with the recording; it is never left over for replay. */
export async function destroyInCallNudgeHudWindow(): Promise<void> {
  if (!isTauri()) return;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const win = await WebviewWindow.getByLabel(IN_CALL_NUDGE_HUD_LABEL);
  if (!win) return;
  await win.destroy().catch((error) =>
    log.warn("in-call-nudge-hud: destroy failed", { error: String(error) }),
  );
}

export async function broadcastInCallHudState(
  state: InCallHudState,
  emission: { id: number; emittedAtMs: number } | null = null,
): Promise<void> {
  if (!isTauri()) return;
  const message: InCallHudStateMessage = {
    state,
    emittedAtMs: Date.now(),
    cardEmissionId: emission?.id ?? null,
    cardEmittedAtMs: emission?.emittedAtMs ?? null,
  };
  void setInCallNudgeHudInteractive(!hudShouldIgnoreCursorEvents(state)).catch((error) =>
    log.warn("in-call-nudge-hud: interaction mode update failed", { error: String(error) }),
  );
  await emit(IN_CALL_HUD_STATE_EVENT, message);
}

export async function listenForInCallHudState(
  onState: (message: InCallHudStateMessage) => void,
): Promise<UnlistenFn> {
  if (!isTauri()) return () => {};
  return listen<InCallHudStateMessage>(IN_CALL_HUD_STATE_EVENT, (event) => onState(event.payload));
}

export async function helloInCallNudgeHud(): Promise<void> {
  if (isTauri()) await emit(IN_CALL_HUD_HELLO_EVENT);
}

export async function dismissInCallNudgeHud(): Promise<void> {
  if (isTauri()) await emit(IN_CALL_HUD_DISMISS_EVENT);
}

export async function listenForInCallHudRequests(handlers: {
  onHello: () => void;
  onDismiss: () => void;
}): Promise<UnlistenFn> {
  if (!isTauri()) return () => {};
  const unHello = await listen(IN_CALL_HUD_HELLO_EVENT, handlers.onHello);
  const unDismiss = await listen(IN_CALL_HUD_DISMISS_EVENT, handlers.onDismiss);
  return () => {
    unHello();
    unDismiss();
  };
}
