import { describe, expect, it, vi } from "vitest";
import type { TranscriptSegment } from "../types";
import { auditSalesCapability } from "./salesJudge";
import { OBJECTION_BATTLECARDS } from "./objectionBuster";
import {
  findLiveConcessionCue,
  findLiveObjectionCue,
  playSoundboardCue,
  SOUNDBOARD_START_BUDGET_MS,
} from "./soundboard";

function segment(id: string, text: string): TranscriptSegment {
  return {
    id,
    source: "them",
    speaker: 1,
    text,
    isFinal: false,
    startMs: 1_000,
    endMs: 1_500,
  };
}

describe("live soundboard cue", () => {
  it("keeps every live counterpunch within the in-call cue limit", () => {
    for (const card of OBJECTION_BATTLECARDS) {
      expect(card.liveCounterpunch.length).toBeLessThanOrEqual(140);
    }
  });

  it("raises an objection counterpunch from an interim buyer segment", () => {
    const cue = findLiveObjectionCue([
      segment("buyer-1", "We already use Gong across the revenue team."),
    ]);

    expect(cue?.key).toBe("buyer-1:obj_competitor");
    expect(cue?.objection.liveCounterpunch).toContain("competitor");
    expect(cue?.objection.liveCounterpunch.length).toBeLessThanOrEqual(140);
  });

  it("never counterpunches the rep's own words", () => {
    expect(findLiveObjectionCue([
      { ...segment("rep-1", "The buyer may say there is no budget."), source: "me" },
    ])).toBeNull();
  });

  it("keeps interim objection updates stable and re-arms a later buyer utterance", () => {
    const first = findLiveObjectionCue([
      segment("buyer-1", "There is no budget."),
    ]);
    const updated = findLiveObjectionCue([
      segment("buyer-1", "There is no budget this quarter."),
    ]);
    const repeated = findLiveObjectionCue([
      segment("buyer-1", "There is no budget this quarter."),
      segment("buyer-2", "I still cannot afford it."),
    ]);

    expect(updated?.key).toBe(first?.key);
    expect(repeated?.key).not.toBe(first?.key);
  });

  it("passes the Marcus Vance gate with a glanceable live counterpunch", () => {
    const cue = findLiveObjectionCue([
      segment("buyer-live", "There is no budget for another tool this quarter."),
    ]);
    expect(cue).not.toBeNull();

    const result = auditSalesCapability({
      featureName: "SAYF-15 Autonomous Objection Counterpunch",
      category: "objection_response",
      inputContext: "An enterprise buyer raises a budget objection during a live call.",
      solutionOutput: cue!.objection.liveCounterpunch,
      targetBuyerPersona: "Enterprise Sales Reps",
      dealSizeUsd: 85_000,
    });

    expect(result.verdict).toBe("DEAL_CLOSER_CERTIFIED");
    expect(result.repUsabilityVerdict).toBe("Glanceable & lethal");
  });

  it("keys a concession to its matching segment instead of later transcript churn", () => {
    const objection = segment("buyer-1", "Can we get 20% off?");
    const first = findLiveConcessionCue([objection]);
    const afterRepReply = findLiveConcessionCue([
      objection,
      { ...segment("rep-1", "Let us trade for term and scope."), source: "me" },
    ]);

    expect(first?.key).toBe("buyer-1:concession_discount");
    expect(afterRepReply?.key).toBe(first?.key);
  });

  it("re-arms the same concession for a new buyer utterance", () => {
    const first = findLiveConcessionCue([segment("buyer-1", "Can we get 20% off?")]);
    const second = findLiveConcessionCue([
      segment("buyer-1", "Can we get 20% off?"),
      segment("buyer-2", "We still need a discount."),
    ]);

    expect(second?.concession.id).toBe("concession_discount");
    expect(second?.key).not.toBe(first?.key);
  });

  it("does not fire a concession cue from the rep's own talk track", () => {
    expect(findLiveConcessionCue([
      { ...segment("rep-1", "We do not give an unearned discount."), source: "me" },
    ])).toBeNull();
  });

  it("passes the Marcus Vance gate with a margin-protecting cue", () => {
    const cue = findLiveConcessionCue([
      segment("buyer-live", "Can we get 20% off to fit the budget?"),
    ]);
    expect(cue).not.toBeNull();

    const result = auditSalesCapability({
      featureName: "SAYF-16 Soundboard Audio Hook",
      category: "objection_response",
      inputContext: "A buyer pushes for an unearned discount during a live enterprise call.",
      solutionOutput: cue!.concession.exactCounterpunchScript,
      targetBuyerPersona: "Enterprise Sales Reps & Account Executives",
      dealSizeUsd: 85_000,
    });

    expect(result.verdict).toBe("DEAL_CLOSER_CERTIFIED");
    expect(result.repUsabilityVerdict).toBe("Glanceable & lethal");
  });

  it("schedules an interactive cue immediately and reuses the warm audio context", async () => {
    const starts: number[] = [];
    const stops: number[] = [];
    const connect = vi.fn().mockReturnThis();
    const audioContext = {
      state: "running",
      currentTime: 10,
      destination: {},
      resume: vi.fn(),
      createGain: vi.fn(() => ({
        connect,
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
      })),
      createOscillator: vi.fn(() => ({
        type: "sine",
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect,
        start: (at: number) => starts.push(at),
        stop: (at: number) => stops.push(at),
      })),
    };
    const AudioContextMock = vi.fn(() => audioContext);
    vi.stubGlobal("AudioContext", AudioContextMock);

    const first = await playSoundboardCue();
    const second = await playSoundboardCue();

    expect(AudioContextMock).toHaveBeenCalledOnce();
    expect(AudioContextMock).toHaveBeenCalledWith({ latencyHint: "interactive" });
    expect(starts).toEqual([10.005, 10.005]);
    expect(stops[0] - starts[0]).toBeCloseTo(0.125);
    expect(first?.startupLatencyMs).toBeGreaterThanOrEqual(5);
    expect(first?.startupLatencyMs).toBeLessThanOrEqual(SOUNDBOARD_START_BUDGET_MS);
    expect(second?.withinBudget).toBe(true);
    vi.unstubAllGlobals();
  });
});
