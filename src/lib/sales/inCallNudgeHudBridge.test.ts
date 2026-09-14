import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InCallHudState } from "./inCallNudgeHud";

const tauri = vi.hoisted(() => ({
  emit: vi.fn().mockResolvedValue(undefined),
  windows: [] as FakeWindow[],
}));

class FakeWindow {
  readonly setIgnoreCursorEvents = vi.fn().mockResolvedValue(undefined);
  readonly show = vi.fn().mockResolvedValue(undefined);
  readonly destroy = vi.fn().mockResolvedValue(undefined);
  private readonly listeners = new Map<string, () => void>();

  once(event: string, callback: () => void): void {
    this.listeners.set(event, callback);
    if (event === "tauri://created") queueMicrotask(callback);
  }
}

vi.mock("../tauriEvents", () => ({ isTauri: () => true }));
vi.mock("@tauri-apps/api/event", () => ({
  emit: tauri.emit,
  listen: vi.fn(),
}));
vi.mock("@tauri-apps/api/webviewWindow", () => ({
  WebviewWindow: class extends FakeWindow {
    constructor() {
      super();
      tauri.windows.push(this);
    }

    static getByLabel = vi.fn().mockImplementation(async () => tauri.windows[tauri.windows.length - 1] ?? null);
  },
}));

import {
  broadcastInCallHudState,
  ensureInCallNudgeHudWindow,
} from "./inCallNudgeHudBridge";

const EMPTY_STATE: InCallHudState = {
  objectionCount: 0,
  talkTimeRatio: null,
  card: null,
  cardExpiresAtMs: null,
};

describe("in-call HUD native bridge", () => {
  beforeEach(() => {
    tauri.emit.mockClear();
    tauri.windows.length = 0;
  });

  it("creates click-through, then enables hit testing only while a card is visible", async () => {
    await ensureInCallNudgeHudWindow();
    const win = tauri.windows[0];
    expect(win.setIgnoreCursorEvents).toHaveBeenLastCalledWith(true);

    await broadcastInCallHudState(
      { ...EMPTY_STATE, card: { id: "obj_budget", title: "Budget", rebuttalScript: "Script", followUpQuestion: "Question" } },
      { id: 1, emittedAtMs: 10 },
    );
    await vi.waitFor(() => expect(win.setIgnoreCursorEvents).toHaveBeenLastCalledWith(false));

    await broadcastInCallHudState(EMPTY_STATE);
    await vi.waitFor(() => expect(win.setIgnoreCursorEvents).toHaveBeenLastCalledWith(true));
    expect(tauri.emit).toHaveBeenLastCalledWith(
      "in-call-nudge-hud://state",
      expect.objectContaining({ cardEmissionId: null, cardEmittedAtMs: null }),
    );
  });
});
