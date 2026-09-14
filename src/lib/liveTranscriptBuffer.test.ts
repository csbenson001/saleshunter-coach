import { beforeEach, describe, expect, it, vi } from "vitest";

// The store's logging boundary touches the browser/Tauri runtime. This test is
// intentionally about the live buffer, not logging or native IPC.
vi.mock("./log", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  attachConsoleOnce: vi.fn(),
}));

import { useStore } from "./store";
import { seg } from "./test/fixtures";

const INITIAL = useStore.getState();

beforeEach(() => {
  useStore.setState(INITIAL, true);
  useStore.setState({ appMode: "live", meetingStatus: "recording" });
});

describe("live transcript streaming buffer", () => {
  it("keeps interleaved rep/prospect chunks chronologically aligned by STT timestamps", () => {
    const prospectLate = seg({
      id: "them-late",
      source: "them",
      speaker: 2,
      text: "prospect follows",
      startMs: 1_200,
      endMs: 1_800,
    });
    const rep = seg({
      id: "me-first",
      source: "me",
      speaker: 0,
      text: "rep opens",
      startMs: 0,
      endMs: 900,
    });
    const prospectFirst = seg({
      id: "them-first",
      source: "them",
      speaker: 2,
      text: "prospect replies",
      startMs: 900,
      endMs: 1_200,
    });

    // Network delivery is intentionally interleaved/out of order.
    useStore.getState().upsertSegment(prospectLate);
    useStore.getState().upsertSegment(rep);
    useStore.getState().upsertSegment(prospectFirst);

    expect(useStore.getState().segments).toEqual([rep, prospectFirst, prospectLate]);
  });

  it("evicts segments outside the rolling 30-second timestamp window", () => {
    const expired = seg({
      id: "expired",
      source: "them",
      text: "too old",
      startMs: 0,
      endMs: 800,
    });
    const boundaryExpired = seg({
      id: "boundary-expired",
      source: "me",
      text: "ends at cutoff",
      startMs: 700,
      endMs: 1_000,
    });
    const inWindow = seg({
      id: "in-window",
      source: "me",
      text: "still relevant",
      startMs: 1_000,
      endMs: 2_000,
    });
    const newest = seg({
      id: "newest",
      source: "them",
      text: "latest",
      startMs: 30_000,
      endMs: 31_000,
    });

    useStore.getState().upsertSegment(expired);
    useStore.getState().upsertSegment(boundaryExpired);
    useStore.getState().upsertSegment(inWindow);
    useStore.getState().upsertSegment(newest);

    expect(useStore.getState().segments).toEqual([inWindow, newest]);
  });
});
