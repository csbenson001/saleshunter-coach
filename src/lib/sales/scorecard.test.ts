import { describe, it, expect } from "vitest";
import { evaluateCallScorecard, type TranscriptUtterance } from "./scorecard";

describe("call scorecard engine", () => {
  it("calculates balanced talk ratio and detects open-ended questions", () => {
    const utterances: TranscriptUtterance[] = [
      { speaker: "rep", text: "Welcome! Can you tell me about what led you to look into our coaching platform today?" },
      { speaker: "customer", text: "We have thirty sales reps and their win rates dropped fifteen percent last quarter. We need them to handle objections live." },
      { speaker: "rep", text: "What are the top three objections your reps struggle with most?" },
      { speaker: "customer", text: "Price pushback and competitors like Gong where they don't know how to position our live value." },
      { speaker: "rep", text: "How would a seven-day free trial help your team validate the live coaching uplift?" },
      { speaker: "customer", text: "That would make getting internal approval very straightforward." },
    ];

    const card = evaluateCallScorecard(utterances);

    expect(card.repTalkPercent).toBeLessThan(55);
    expect(card.customerTalkPercent).toBeGreaterThan(45);
    expect(card.openEndedQuestionCount).toBeGreaterThanOrEqual(3);
    expect(card.numericScore).toBeGreaterThanOrEqual(80);
    expect(["A+", "A"]).toContain(card.overallGrade);
  });

  it("penalizes high rep talk ratio and excessive filler words", () => {
    const utterances: TranscriptUtterance[] = [
      { speaker: "rep", text: "Um, like, basically our product is, you know, very powerful and sort of handles everything for like ten minutes straight." },
      { speaker: "customer", text: "Okay." },
    ];

    const card = evaluateCallScorecard(utterances);

    expect(card.repTalkPercent).toBeGreaterThan(70);
    expect(card.fillerWordCount).toBeGreaterThanOrEqual(4);
    expect(card.coachingTips.some((t) => t.includes("filler"))).toBe(true);
  });
});
