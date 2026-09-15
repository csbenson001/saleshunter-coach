import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COMPETITIVE_KILL_CARDS, competitiveKillCardForHud } from "../../lib/sales/competitiveBattlecards";
import { InCallNudgeHudContent } from "./InCallNudgeHud";

describe("competitive kill card HUD", () => {
  it("renders the Marcus Vance four-line format without a fifth label", () => {
    const card = competitiveKillCardForHud(COMPETITIVE_KILL_CARDS[0]);
    const html = renderToStaticMarkup(
      <InCallNudgeHudContent
        state={{
          objectionCount: 1,
          talkTimeRatio: null,
          card,
          cardExpiresAtMs: 12_000,
        }}
        onDismiss={() => undefined}
      />,
    );

    expect(html).toContain(card.title);
    expect(html).toContain(card.trap);
    expect(html).toContain(card.rebuttalScript);
    expect(html).toContain(card.followUpQuestion);
    expect(html).not.toContain("Follow-up question");
  });
});
