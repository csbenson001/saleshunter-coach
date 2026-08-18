import { describe, it, expect } from "vitest";
import { countFillerSounds } from "./fillerWords";

describe("countFillerSounds", () => {
  it("counts English hesitations", () => {
    expect(countFillerSounds("um so uh yeah")).toBe(2);
    expect(countFillerSounds("er, I mean, erm")).toBe(2);
    expect(countFillerSounds("hmm let me think")).toBe(1);
  });

  it("collapses repeated runs to a single event", () => {
    expect(countFillerSounds("ummm")).toBe(1);
  });

  it("does not match hesitation letters inside real words", () => {
    expect(countFillerSounds("a human ahead, yeah, summary")).toBe(0);
  });

  it("returns 0 for empty / whitespace", () => {
    expect(countFillerSounds("")).toBe(0);
    expect(countFillerSounds("   ")).toBe(0);
  });
});
