import { beforeEach, describe, expect, it, vi } from "vitest";

const tauri = vi.hoisted(() => ({
  emit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../tauriEvents", () => ({ isTauri: () => true }));
vi.mock("@tauri-apps/api/event", () => ({
  emit: tauri.emit,
  listen: vi.fn(),
}));

import {
  broadcastManagerWhisper,
  IN_CALL_MANAGER_WHISPER_EVENT,
} from "./inCallNudgeHudBridge";

describe("manager whisper channel", () => {
  beforeEach(() => tauri.emit.mockClear());

  it("delivers the dashboard prompt through a dedicated IPC event", async () => {
    await broadcastManagerWhisper({
      id: "manager-1",
      message: "Ask who else needs to approve this.",
      sentAtMs: 10_000,
    });

    expect(tauri.emit).toHaveBeenCalledWith(IN_CALL_MANAGER_WHISPER_EVENT, {
      id: "manager-1",
      message: "Ask who else needs to approve this.",
      sentAtMs: 10_000,
    });
  });
});
