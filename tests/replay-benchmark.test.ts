import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "../src/lib/types";
import {
  makeReport,
  normalizeTranscript,
  replaySegments,
} from "../scripts/replay-benchmark";

const segment = (id: string, text: string, endMs: number, source = "them"): TranscriptSegment => ({
  id,
  source: source as TranscriptSegment["source"],
  speaker: 1,
  text,
  isFinal: true,
  startMs: Math.max(0, endMs - 1_000),
  endMs,
});

describe("replay benchmark runner", () => {
  it("normalizes common JSON export shapes and keeps timeline units in milliseconds", () => {
    const segments = normalizeTranscript({
      utterances: [
        { utteranceId: "u1", role: "prospect", text: "We use Gong.", start: 1, end: 2 },
        { id: "u2", speakerRole: "rep", text: "I understand.", startMs: 2_000, endMs: 3_000 },
      ],
    }, "fixture.json");

    expect(segments).toEqual([
      expect.objectContaining({ id: "u1", source: "them", startMs: 1_000, endMs: 2_000 }),
      expect.objectContaining({ id: "u2", source: "me", startMs: 2_000, endMs: 3_000 }),
    ]);
  });

  it("replays the production reducer and records only newly rendered cues", async () => {
    const replay = await replaySegments([
      segment("u1", "We already use Gong.", 1),
      segment("u2", "How does local capture work?", 2),
      segment("u3", "Can we get a 20% discount?", 3),
    ], { pace: 1_000_000, sleep: async () => undefined });

    expect(replay.samples).toHaveLength(2);
    expect(replay.samples.map((sample) => sample.cueId)).toEqual(["obj_competitor", "concession_discount"]);
  });

  it("fails the report when P95 exceeds the 2 second SLA", () => {
    const report = makeReport("holdout", 1, ["a.json"], [segment("u1", "x", 1)], [
      { segmentId: "u1", utteranceEndMs: 1, cueId: "obj_budget", latencyMs: 2_001 },
    ]);

    expect(report.latencyMs.p95).toBe(2_001);
    expect(report.p95LatencyMs).toBe(2_001);
    expect(report.verdict).toBe("FAIL");
    expect(report.failureReasons.join(" ")).toContain("P95 latency");
  });
});
