# SAL-22 — Post-Call Executive Summary & Deal Action Memo

## Scope

This contract covers the application boundary that turns a completed call's
final transcript into two durable outputs: a prospect-ready recap and an
internal deal-health memo. Native recording shutdown, the deep-lane LLM
provider, persistence, and the React delivery surface are adapters around this
boundary; the red-bar gate uses a deterministic injected draft generator and
the existing transcript/risk engines.

## Acceptance criteria

- **AC-1 — Post-call SLA:** When a call ends with at least one final spoken
  segment, the post-call pipeline starts exactly once for that call and the
  memo is available within 15,000 ms of `callEndedAtMs`. A provider timeout or
  failure produces an explicit error state and never publishes a partial memo.
  No second generation may be started by duplicate recording-save events.
- **AC-2 — Commitment-only client recap:** The client-facing `recap` is fewer
  than 150 whitespace-delimited words and contains only commitments grounded in
  the supplied transcript/draft: the agreed problem, proposed solution,
  timeline, and every mutual-action-plan item with its owner and due date when
  one was agreed. It must not add a pricing promise, feature claim, or generic
  marketing copy that is absent from the call.
- **AC-3 — Internal deal memo:** The internal output contains a deterministic
  health grade (`A`–`F`), all missing MEDDIC components (`M`, `E`, `DC`, `DP`,
  `I`, `C`), transcript evidence for each detected risk, and discount exposure
  (`none`, `low`, `medium`, or `high`). A detected discount/price-reduction
  request is at least `high` exposure until a value-for-value trade is recorded.
  MEDDIC and risk values must be derived from final segments only and must use
  the existing `evaluateLiveDealRisk` / concession-detection engines rather
  than duplicating their phrase lists.
- **AC-4 — Delivery actions:** The completed memo exposes the client recap and
  email body to the existing follow-up surface. The UI provides one action that
  writes the selected client-facing text to the system clipboard and one action
  that launches the default email client with a `mailto:` URL containing the
  generated subject and URL-encoded body. Both actions are disabled or report a
  visible error when their native/browser adapter fails.
- **AC-5 — Determinism and isolation:** The domain function is framework-free
  and accepts an injected clock and draft generator. It must not import React,
  Zustand, Tauri, timers, or browser globals; production adapters own those
  boundaries. The same call id, final transcript, and draft produce the same
  recap, action plan, MEDDIC gaps, risk evidence, and grade.

## Expected interface

Create `src/lib/sales/executiveDealMemo.ts` with these exports:

```ts
import type { TranscriptSegment } from "../types";

export const EXECUTIVE_MEMO_SLA_MS = 15_000;
export const EXECUTIVE_MEMO_TIMEOUT_CODE = "EXECUTIVE_MEMO_TIMEOUT";
export type MeddicKey = "M" | "E" | "DC" | "DP" | "I" | "C";
export type DealHealthGrade = "A" | "B" | "C" | "D" | "F";
export type DiscountExposure = "none" | "low" | "medium" | "high";

export interface MutualAction {
  owner: "seller" | "prospect" | "mutual";
  action: string;
  dueDate?: string;
}

export interface ExecutiveDealMemoInput {
  callId: string;
  callTitle: string;
  callEndedAtMs: number;
  segments: readonly TranscriptSegment[];
  prospectName?: string;
}

export interface ExecutiveDealMemoDraft {
  agreedProblem: string;
  proposedSolution: string;
  timeline: string;
  mutualActionPlan: readonly MutualAction[];
}

export interface ExecutiveDealMemo {
  callId: string;
  generatedAtMs: number;
  clientFacing: {
    recap: string;
    emailSubject: string;
    emailBody: string;
  };
  mutualActionPlan: readonly MutualAction[];
  internal: {
    grade: DealHealthGrade;
    healthScore: number;
    missingMeddicComponents: readonly MeddicKey[];
    discountExposure: DiscountExposure;
    riskEvidence: readonly string[];
  };
}

export interface ExecutiveDealMemoOptions {
  generateDraft: (input: ExecutiveDealMemoInput) => Promise<ExecutiveDealMemoDraft>;
  now?: () => number;
}

export class ExecutiveDealMemoTimeoutError extends Error {
  readonly code: typeof EXECUTIVE_MEMO_TIMEOUT_CODE;
}

export function generateExecutiveDealMemo(
  input: ExecutiveDealMemoInput,
  options: ExecutiveDealMemoOptions,
): Promise<ExecutiveDealMemo>;
```

`generateDraft` is the only LLM seam. It must be called once per call and
production code must race it against `EXECUTIVE_MEMO_SLA_MS`; the timeout error
must be an `ExecutiveDealMemoTimeoutError` with
`code === EXECUTIVE_MEMO_TIMEOUT_CODE` so the caller can render a retry state. The generator
must reject empty/partial-only transcripts instead of creating a fabricated
memo. Final segments should be deduplicated by id before risk analysis, in the
same way as the live risk seam.

The health grade is derived from `healthScore` using fixed bands: `A` 85–100,
`B` 70–84, `C` 55–69, `D` 40–54, and `F` 0–39. `riskEvidence` contains short
verbatim matched phrases, not generated claims. `emailBody` must contain the
same recap and exact action-plan commitments; it may add a greeting/sign-off
but may not add an offer or URL not present in the draft.

## Red-bar gate

The committed test is
`src/lib/sales/executiveDealMemo.contract.test.ts`:

```sh
npx vitest run src/lib/sales/executiveDealMemo.contract.test.ts
```

It must fail before `executiveDealMemo.ts` exists and pass after the domain
function and post-call wiring are implemented. The fixture deliberately
contains a discount request, a known pain point, and incomplete MEDDIC data so
the red bar checks both client commitments and internal risk output.

## Builder instructions and constraints

1. Implement the pure domain module and make the focused gate green first.
2. Add one post-call runner invoked from the existing
   `meeting://recording-saved` path after final transcript availability. Guard
   by `callId`/history entry id, persist the memo with the history analysis
   outputs, and expose loading/success/error state in the study view.
3. Replace the current hard-coded fallback copy in
   `FollowUpPackModal` with the generated client-facing fields. Preserve its
   existing copy behavior, add a default-email-client launcher, and cover both
   actions with a React test using `react-test-renderer` plus injected clipboard
   and opener seams (no real browser or Tauri process).
4. Use the existing `evaluateLiveDealRisk` and concession detection code; do
   not copy or broaden its regular expressions in the memo module.
5. Keep all tests deterministic: fixed timestamps, injected draft output, no
   real provider/network calls, no `Date.now()` in the domain module, and no
   sleeps. After the focused gate, run the frontend typecheck and relevant
   existing history/study tests.
