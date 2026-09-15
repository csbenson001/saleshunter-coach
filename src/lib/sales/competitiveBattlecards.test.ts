import { describe, expect, it } from "vitest";
import {
  COMPETITIVE_KILL_CARD_MAX_CHARACTERS,
  COMPETITIVE_KILL_CARDS,
  competitiveKillCardForHud,
  formatCompetitiveKillCard,
  matchCompetitiveKillCard,
} from "./competitiveBattlecards";

describe("competitive micro-kill-sheets", () => {
  it("covers every required competitor", () => {
    expect(COMPETITIVE_KILL_CARDS.map((card) => card.id)).toEqual([
      "gong",
      "chorus",
      "clari",
      "weflow",
      "scratchpad",
    ]);
  });

  it.each([
    ["Gong", "We already pay for Gong.io.", "gong"],
    ["Gong STT", "Our team uses Gong dot io.", "gong"],
    ["Chorus", "We standardized on ZoomInfo Chorus.", "chorus"],
    ["Chorus STT", "We review calls in Chorus dot AI.", "chorus"],
    ["Clari", "Clari already handles this.", "clari"],
    ["Clari STT", "The forecast is in Clary.", "clari"],
    ["Weflow", "Our reps use Weflow.", "weflow"],
    ["Weflow STT", "We log notes in We Flow.", "weflow"],
    ["Scratchpad", "We already bought Scratchpad.", "scratchpad"],
    ["Scratchpad STT", "The team uses Scratch Pad.", "scratchpad"],
  ])("matches the %s transcript heuristic", (_label, transcript, expectedId) => {
    expect(matchCompetitiveKillCard(transcript)?.id).toBe(expectedId);
  });

  it.each(["gonged the bell", "the choruses were loud", "clarity matters", "workflow notes"])(
    "does not match competitor-name substrings in %j",
    (transcript) => {
      expect(matchCompetitiveKillCard(transcript)).toBeNull();
    },
  );

  it("enforces the four-line, 280-character HUD contract", () => {
    for (const card of COMPETITIVE_KILL_CARDS) {
      const formatted = formatCompetitiveKillCard(card);
      const lines = formatted.split("\n");

      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe(`[${card.competitor.toUpperCase()} MENTIONED]`);
      expect(lines[1]).toMatch(/^Trap: /);
      expect(lines[2]).toMatch(/^Say: “.+”$/);
      expect(lines[3]).toMatch(/^Ask: “.+\?”$/);
      expect(formatted.length).toBeLessThanOrEqual(COMPETITIVE_KILL_CARD_MAX_CHARACTERS);
    }
  });

  it("maps all four lines into the floating HUD card", () => {
    const gong = COMPETITIVE_KILL_CARDS[0];
    expect(competitiveKillCardForHud(gong)).toEqual({
      id: "competitor_gong",
      title: gong.trigger,
      trap: gong.trap,
      rebuttalScript: gong.counterStrike,
      followUpQuestion: gong.pivotQuestion,
    });
  });
});
