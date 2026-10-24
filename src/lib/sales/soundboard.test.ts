import { describe, expect, it, vi } from "vitest";
import type { TranscriptSegment } from "../types";
import { auditSalesCapability } from "./salesJudge";
import {
  findLiveConcessionCue,
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
  it("keys a concession to its matching segment instead of later transcript churn", () => {
    const objection = segment("buyer-1", "Can we get 20% off?");
    const first = findLiveConcessionCue([objection]);
    const afterRepReply = findLiveConcessionCue([
      objection,
      segment("rep-1", "Let us trade for term and scope."),
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
