import { describe, it, expect } from "vitest";
import { matchObjection, OBJECTION_BATTLECARDS } from "./objectionBuster";

describe("objectionBuster engine", () => {
  it("matches Gong competitor objection with in-call differentiator", () => {
    const card = matchObjection("Honestly we already have Chorus and we use Gong across our entire org.");
    expect(card).toBeDefined();
    expect(card?.category).toBe("competitor");
    expect(card?.rebuttalScript).toContain("Gong and Chorus");
    expect(card?.followUpQuestion).toContain("review");
  });

  it("matches budget pushback objection", () => {
    const card = matchObjection("It looks neat but we have a spend freeze and it's too expensive.");
    expect(card).toBeDefined();
    expect(card?.category).toBe("budget");
    expect(card?.followUpQuestion).toContain("$49/mo");
  });

  it("returns null when no objection phrases match", () => {
    const card = matchObjection("Can you show me the next slide on the dashboard?");
    expect(card).toBeNull();
  });

  it("contains all required battlecard categories", () => {
    const categories = OBJECTION_BATTLECARDS.map((c) => c.category);
    expect(categories).toContain("budget");
    expect(categories).toContain("competitor");
    expect(categories).toContain("timing");
    expect(categories).toContain("authority");
    expect(categories).toContain("currency");
  });

  it("matches multi-currency and FX risk pushback", () => {
    const card = matchObjection("We cannot pay in USD, we can only pay in euros due to currency fluctuation.");
    expect(card).toBeDefined();
    expect(card?.category).toBe("currency");
    expect(card?.rebuttalScript).toContain("fixed exchange rate collars");
    expect(card?.followUpQuestion).toContain("decision sign-off");
  });
});
