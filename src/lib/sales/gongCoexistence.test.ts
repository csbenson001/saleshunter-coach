import { describe, expect, it } from "vitest";
import {
  GONG_COEXISTENCE_PROOF,
  detectGongIncumbentObjection,
} from "./gongCoexistence";

describe("Gong incumbent coexistence defense", () => {
  it("detects the deployed-incumbent objection from the target buyer", () => {
    expect(
      detectGongIncumbentObjection(
        "We already have Gong deployed across 200 reps, so why would we add another tool?"
      )
    ).toBe(true);
    expect(detectGongIncumbentObjection("Our revenue team uses Chorus today.")).toBe(true);
    expect(detectGongIncumbentObjection("We're already using Gong for every call.")).toBe(true);
  });

  it("does not interrupt the rep for a casual competitor mention", () => {
    expect(detectGongIncumbentObjection("Have you heard what Gong announced this week?")).toBe(false);
    expect(detectGongIncumbentObjection("Can you compare the dashboard with Gong?")).toBe(false);
  });

  it("defines a bounded pilot against the deal-cycle metric", () => {
    expect(GONG_COEXISTENCE_PROOF).toEqual({
      seatCount: 20,
      successMetric: "time_to_close",
      targetRoiMultiplier: 50,
    });
  });
});
