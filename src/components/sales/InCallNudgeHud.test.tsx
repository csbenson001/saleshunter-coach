import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { InCallNudgeHudCommitProbe, InCallNudgeHudContent } from "./InCallNudgeHud";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function CommitHarness({
  emission,
  onCommit,
}: {
  emission: { id: number; emittedAtMs: number } | null;
  onCommit: (measurement: { id: number; latencyMs: number }) => void;
}) {
  return <InCallNudgeHudCommitProbe emission={emission} onCommit={onCommit} />;
}

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

  it("measures 100 actual React layout commits under the HUD budget", () => {
    const latencies: number[] = [];
    let renderer: ReactTestRenderer | undefined;

    act(() => {
      renderer = create(
        <CommitHarness
          emission={null}
          onCommit={(measurement) => latencies.push(measurement.latencyMs)}
        />,
      );
    });

    for (let id = 1; id <= 100; id += 1) {
      const emittedAtMs = Date.now();
      act(() => {
        renderer!.update(
          <CommitHarness
            emission={{ id, emittedAtMs }}
            onCommit={(measurement) => latencies.push(measurement.latencyMs)}
          />,
        );
      });
    }

    latencies.sort((a, b) => a - b);
    console.info(`in-call HUD 100-event React commit p95: ${latencies[94].toFixed(4)} ms`);
    expect(latencies).toHaveLength(100);
    expect(latencies[94]).toBeLessThan(100);
    act(() => renderer!.unmount());
  });
});
