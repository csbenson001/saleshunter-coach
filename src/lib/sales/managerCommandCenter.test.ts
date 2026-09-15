import { describe, expect, it, vi } from "vitest";
import {
  buildManagerCommandCenter,
  dispatchManagerWhisper,
  MANAGER_WHISPER_DELIVERY_SLA_MS,
  measureManagerWhisperDelivery,
  recordDealProgression,
} from "./managerCommandCenter";
import type {
  ManagerLiveCallInput,
  ManagerWhisperDispatch,
} from "./managerCommandCenter";

const OBJECTION = {
  id: "budget",
  title: "Budget pressure",
  rebuttalScript: "Tie the investment to the missed-deal cost.",
  followUpQuestion: "Which metric must finance approve?",
} as const;

const CALL: ManagerLiveCallInput = {
  callId: "call-1",
  repId: "rep-1",
  repName: "Alex Rivera",
  talkTimeRatio: { rep: 0.42, prospect: 0.58 },
  activeObjections: [OBJECTION],
  meddic: [
    { key: "M", complete: true },
    { key: "E", complete: true },
    { key: "DC", complete: false },
    { key: "DP", complete: false },
    { key: "I", complete: true },
    { key: "C", complete: false },
  ],
};

describe("SAL-19 manager command center contract", () => {
  it("projects live calls with talk time, active objections, and MEDDIC completion", () => {
    const [card] = buildManagerCommandCenter([CALL]);

    expect(card).toMatchObject({
      callId: "call-1",
      repId: "rep-1",
      repName: "Alex Rivera",
      talkTimeRatio: { rep: 0.42, prospect: 0.58 },
      activeObjections: [OBJECTION],
      meddicCompletedCount: 3,
      meddicTotal: 6,
    });
  });

  it("rejects more than ten active calls instead of silently hiding one", () => {
    expect(() =>
      buildManagerCommandCenter(
        Array.from({ length: 11 }, (_, index) => ({
          ...CALL,
          callId: `call-${index}`,
        })),
      ),
    ).toThrow(RangeError);
  });

  it("dispatches one trimmed, targeted whisper and creates its audit entry", async () => {
    const send = vi.fn<(dispatch: ManagerWhisperDispatch) => Promise<void>>().mockResolvedValue(undefined);

    const audit = await dispatchManagerWhisper(
      {
        id: "whisper-1",
        callId: "call-1",
        repId: "rep-1",
        message: "  Ask who else needs to approve this.  ",
        sentAtMs: 10_000,
      },
      send,
    );

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      id: "whisper-1",
      callId: "call-1",
      repId: "rep-1",
      message: "Ask who else needs to approve this.",
      sentAtMs: 10_000,
    });
    expect(audit).toEqual({
      id: "whisper-1",
      callId: "call-1",
      repId: "rep-1",
      message: "Ask who else needs to approve this.",
      sentAtMs: 10_000,
      progression: [],
    });

    const progressed = recordDealProgression(audit, {
      id: "stage-1",
      callId: "call-1",
      stage: "discovery-complete",
      occurredAtMs: 12_500,
    });
    expect(progressed.progression).toEqual([
      {
        id: "stage-1",
        callId: "call-1",
        stage: "discovery-complete",
        occurredAtMs: 12_500,
      },
    ]);
  });

  it("rejects blank and 25-word whispers before transport", async () => {
    const send = vi.fn<(dispatch: ManagerWhisperDispatch) => Promise<void>>().mockResolvedValue(undefined);
    const base = { id: "w", callId: "call-1", repId: "rep-1", sentAtMs: 10_000 };

    await expect(dispatchManagerWhisper({ ...base, message: "   " }, send)).rejects.toThrow();
    await expect(
      dispatchManagerWhisper(
        { ...base, message: Array.from({ length: 25 }, (_, i) => `word${i}`).join(" ") },
        send,
      ),
    ).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it("does not report an audit entry when the transport fails", async () => {
    const send = vi.fn<(dispatch: ManagerWhisperDispatch) => Promise<void>>()
      .mockRejectedValue(new Error("rep seat unavailable"));

    await expect(
      dispatchManagerWhisper(
        {
          id: "whisper-failed",
          callId: "call-1",
          repId: "rep-1",
          message: "Ask the approval question.",
          sentAtMs: 10_000,
        },
        send,
      ),
    ).rejects.toThrow("rep seat unavailable");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("passes delivery at 500ms and fails delivery after the SLA", () => {
    const dispatch: ManagerWhisperDispatch = {
      id: "whisper-1",
      callId: "call-1",
      repId: "rep-1",
      message: "Ask the approval question.",
      sentAtMs: 10_000,
    };

    expect(MANAGER_WHISPER_DELIVERY_SLA_MS).toBe(500);
    expect(measureManagerWhisperDelivery(dispatch, 10_500)).toEqual({
      latencyMs: 500,
      withinSla: true,
    });
    expect(measureManagerWhisperDelivery(dispatch, 10_501)).toEqual({
      latencyMs: 501,
      withinSla: false,
    });
  });
});
