import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listenForTranscript } from "../tauriEvents";
import { useStore } from "../store";

const bridge = vi.hoisted(() => ({
  broadcastInCallHudState: vi.fn().mockResolvedValue(undefined),
  destroyInCallNudgeHudWindow: vi.fn().mockResolvedValue(undefined),
  ensureInCallNudgeHudWindow: vi.fn().mockResolvedValue(undefined),
  listenForInCallHudRequests: vi.fn().mockResolvedValue(() => {}),
  listenForManagerWhispers: vi.fn().mockResolvedValue(() => {}),
  setInCallNudgeHudInteractive: vi.fn().mockResolvedValue(undefined),
}));

const transcriptEvents = vi.hoisted(() => ({
  listen: vi.fn(),
}));

vi.mock("./inCallNudgeHudBridge", () => bridge);
vi.mock("@tauri-apps/api/event", () => ({ listen: transcriptEvents.listen }));

import { useInCallNudgeHudHost } from "./useInCallNudgeHudHost";

function Host(): null {
  useInCallNudgeHudHost();
  return null;
}

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("live objection defense HUD wiring", () => {
  let renderer: ReactTestRenderer;
  let onTranscript: ((event: { payload: Record<string, unknown> }) => void) | undefined;

  beforeEach(() => {
    (globalThis as { window?: unknown }).window = {
      setInterval: globalThis.setInterval?.bind(globalThis),
      clearInterval: globalThis.clearInterval?.bind(globalThis),
      __TAURI_INTERNALS__: {},
    };
    transcriptEvents.listen.mockImplementation(async (_event: string, callback: typeof onTranscript) => {
      onTranscript = callback;
      return () => {};
    });
    bridge.broadcastInCallHudState.mockClear();
    bridge.destroyInCallNudgeHudWindow.mockClear();
    bridge.ensureInCallNudgeHudWindow.mockClear();
    bridge.listenForInCallHudRequests.mockClear();
    bridge.listenForManagerWhispers.mockClear();
    bridge.setInCallNudgeHudInteractive.mockClear();
    useStore.setState({ meetingStatus: "recording", meetingStartedAt: 123, segments: [] });
  });

  afterEach(() => {
    renderer?.unmount();
    useStore.setState({ meetingStatus: "idle", meetingStartedAt: null, segments: [] });
    onTranscript = undefined;
  });

  it("surfaces concession trades when a final transcript event reaches the live HUD", async () => {
    await act(async () => {
      renderer = create(<Host />);
    });
    await listenForTranscript();

    await act(async () => {
      onTranscript?.({
        payload: {
          id: "discount-1",
          source: "them",
          speaker: 2,
          text: "Can we get a 20% discount?",
          is_final: true,
          start_ms: 1_000,
          end_ms: 2_000,
        },
      });
    });

    const hudState = bridge.broadcastInCallHudState.mock.calls
      .map(([state]) => state as { card: Record<string, unknown> | null })
      .find((state) => state.card?.id === "concession_discount");

    expect(hudState?.card).toEqual(expect.objectContaining({
      title: "Discount Pressure Detected",
      tradeOptions: expect.arrayContaining([
        "Annual Upfront Pre-Pay",
        "2-Year Multi-Year Lock",
        "Executive Case Study & Reference",
      ]),
    }));
  });
});
