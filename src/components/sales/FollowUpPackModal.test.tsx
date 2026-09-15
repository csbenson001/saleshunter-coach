import { create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { FollowUpPackModal } from "./FollowUpPackModal";
import type { ExecutiveDealMemo } from "../../lib/sales/executiveDealMemo";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const memo: ExecutiveDealMemo = {
  callId: "call-1",
  generatedAtMs: 1_000,
  clientFacing: {
    recap: "Agreed problem: slow follow-up.\nProposed solution: live coaching.",
    emailSubject: "Follow-up: Acme",
    emailBody: "Hi Jordan,\n\nAgreed problem: slow follow-up.",
  },
  mutualActionPlan: [],
  internal: {
    grade: "B",
    healthScore: 72,
    missingMeddicComponents: ["M"],
    discountExposure: "none",
    riskEvidence: [],
  },
};

function buttonWithLabel(renderer: ReturnType<typeof create>, label: string) {
  return renderer.root.findAll(
    (node) => node.type === "button" && node.children.some((child) => child === label),
  )[0];
}

describe("FollowUpPackModal delivery actions", () => {
  it("copies the generated email and opens a mailto URL through injected adapters", async () => {
    const clipboard = vi.fn().mockResolvedValue(undefined);
    const openEmail = vi.fn();
    let renderer!: ReturnType<typeof create>;

    renderer = create(
      <FollowUpPackModal
        isOpen
        onClose={() => undefined}
        meetingTitle="Acme"
        prospectEmail="jordan@example.com"
        memo={memo}
        clipboard={clipboard}
        openEmail={openEmail}
      />,
    );

    await buttonWithLabel(renderer, "Copy").props.onClick();
    buttonWithLabel(renderer, "Open Email Client").props.onClick();

    expect(clipboard).toHaveBeenCalledWith(memo.clientFacing.emailBody);
    expect(openEmail).toHaveBeenCalledWith(expect.stringContaining("mailto:jordan%40example.com"));
    expect(openEmail).toHaveBeenCalledWith(expect.stringContaining("subject=Follow-up%3A+Acme"));
  });

  it("renders a visible error when the clipboard adapter fails", async () => {
    const clipboard = vi.fn().mockRejectedValue(new Error("clipboard unavailable"));
    let renderer!: ReturnType<typeof create>;

    renderer = create(
      <FollowUpPackModal
        isOpen
        onClose={() => undefined}
        meetingTitle="Acme"
        memo={memo}
        clipboard={clipboard}
        openEmail={() => undefined}
      />,
    );
    await buttonWithLabel(renderer, "Copy").props.onClick();

    expect(renderer.root.findByProps({ role: "alert" }).children.join("")).toContain("clipboard unavailable");
  });
});
