import { describe, expect, it } from "vitest";
import type { TranscriptSegment } from "../types";
import {
  initialLiveObjectionDefenseState,
  reduceLiveObjectionDefense,
} from "./liveObjectionDefense";

function segment(
  id: string,
  text: string,
  overrides: Partial<TranscriptSegment> = {},
): TranscriptSegment {
  return {
    id,
    source: "them",
    speaker: 2,
    text,
    isFinal: true,
    startMs: 1_000,
    endMs: 2_000,
    ...overrides,
  };
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

describe("live objection defense transcript integration", () => {
  it("routes a discount request to concession trades and returns a glanceable cue", () => {
    const state = reduceLiveObjectionDefense(
      initialLiveObjectionDefenseState(),
      segment("discount-1", "Can we get a 20% discount to make this work?"),
    );

    expect(state.objectionCount).toBe(1);
    expect(state.cue).toEqual(expect.objectContaining({
      kind: "concession",
      engine: "concessionMatrix",
    }));

    const cue = state.cue!;
    expect(cue.id).toBe("concession_discount");
    expect(wordCount(cue.script)).toBeLessThan(25);
    expect(cue.script).not.toMatch(/\b(look|honestly|just|you know|obviously|unfortunately)\b/i);

    const trades = cue.tradeOptions.join(" ").toLowerCase();
    expect(trades).toMatch(/payment|pre-pay|net-/);
    expect(trades).toMatch(/multi-year|2-year|24-month/);
    expect(trades).toMatch(/case study|reference/);
  });

  it("routes a non-pricing objection through objectionBuster", () => {
    const state = reduceLiveObjectionDefense(
      initialLiveObjectionDefenseState(),
      segment("competitor-1", "We already use Gong across the whole sales team."),
    );

    expect(state.objectionCount).toBe(1);
    expect(state.cue).toEqual(expect.objectContaining({
      id: "obj_competitor",
      kind: "objection",
      engine: "objectionBuster",
    }));
    expect(wordCount(state.cue!.script)).toBeLessThan(25);
  });

  it("ignores partial, rep-side, empty, and duplicate transcript events", () => {
    const initial = initialLiveObjectionDefenseState();
    const partial = reduceLiveObjectionDefense(
      initial,
      segment("partial-1", "Can we get a 20% discount", { isFinal: false }),
    );
    const rep = reduceLiveObjectionDefense(
      partial,
      segment("rep-1", "I can explain our pricing.", { source: "me" }),
    );
    const empty = reduceLiveObjectionDefense(rep, segment("empty-1", "   "));
    const matched = reduceLiveObjectionDefense(
      empty,
      segment("final-1", "Can we get a 20% discount?"),
    );
    const duplicate = reduceLiveObjectionDefense(
      matched,
      segment("final-1", "Can we get a 20% discount?"),
    );

    expect(partial).toEqual(initial);
    expect(rep).toEqual(initial);
    expect(empty).toEqual(initial);
    expect(matched.objectionCount).toBe(1);
    expect(duplicate).toEqual(matched);
  });

  it("replaces a cue for a new objection while preserving it for unrelated speech", () => {
    const first = reduceLiveObjectionDefense(
      initialLiveObjectionDefenseState(),
      segment("first", "We already have Gong."),
    );
    const unrelated = reduceLiveObjectionDefense(
      first,
      segment("unrelated", "How does the local audio capture work?"),
    );
    const second = reduceLiveObjectionDefense(
      unrelated,
      segment("second", "Can we get a 20% discount?"),
    );

    expect(unrelated).toEqual(first);
    expect(second.objectionCount).toBe(2);
    expect(second.cue?.id).toBe("concession_discount");
  });
});
