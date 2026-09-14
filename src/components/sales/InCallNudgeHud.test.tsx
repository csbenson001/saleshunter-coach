import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InCallNudgeHudContent } from "./InCallNudgeHud";

describe("in-call nudge HUD rendering", () => {
  it("renders card content and rounded talk-time metrics", () => {
    const html = renderToStaticMarkup(
      <InCallNudgeHudContent
        state={{
          objectionCount: 3,
          talkTimeRatio: { me: 0.426, them: 0.574 },
          card: {
            id: "obj_budget",
            title: "Too expensive",
            rebuttalScript: "Tie the investment to the missed deal.",
            followUpQuestion: "Which metric does finance need to approve this?",
          },
          cardExpiresAtMs: 12_000,
        }}
        onDismiss={() => undefined}
      />,
    );

    expect(html).toContain("Objections: 3");
    expect(html).toContain("Talk time: 43% / 57%");
    expect(html).toContain("Too expensive");
    expect(html).toContain("Tie the investment to the missed deal.");
    expect(html).toContain("Which metric does finance need to approve this?");
  });

  it("renders an explicit unavailable state when talk-time data is null", () => {
    const html = renderToStaticMarkup(
      <InCallNudgeHudContent
        state={{ objectionCount: 0, talkTimeRatio: null, card: null, cardExpiresAtMs: null }}
        onDismiss={() => undefined}
      />,
    );

    expect(html).toContain("Talk time unavailable");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("Infinity");
  });
});
