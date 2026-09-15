# SAL-12 — Real-Time In-Call MEDDIC Tracker & Deal Risk Scoring

## Scope

This contract covers the deterministic frontend seam that consumes the current
live transcript segments and produces qualification state, deal momentum, and
rep talk-time warnings. It does not add an LLM call, a transcription provider,
or a native audio-capture dependency.

## Acceptance criteria

- **AC-1 — Stream qualification detection:** `evaluateLiveDealRisk` considers
  finalized transcript segments in timestamp order and tracks the six MEDDIC
  criteria. It must identify Economic Buyer (`E`), Decision Criteria (`DC`),
  and Identify Pain (`I`) from the synthetic phrases in the red-bar fixture.
  A criterion is `confirmed` only when a case-insensitive keyword pattern has
  matched; its first matching phrase is retained as `evidenceQuote`. Partial
  segments must not confirm a criterion.
- **AC-2 — Badge-ready status:** Every returned criterion has exactly one
  status (`confirmed` or `missing`) and a presentation tone (`green` for
  `confirmed`, `red` for `missing`). The result is stable for an unchanged
  segment set and contains no UI component or browser dependency. The UI may
  render these values as color-coded status badges without reimplementing
  qualification logic.
- **AC-3 — Live deal risk and momentum:** The result includes the existing
  buying-signal/deal-risk classifications and the existing bounded health score
  (`5..98`) plus `momentum` (`positive`, `neutral`, or `at_risk`). The high-risk
  fixture must identify budget, authority, and timeline risks and return
  `momentum: "at_risk"` with `healthScore <= 45`.
- **AC-4 — Sustained talk-time alert:** Using only finalized `me` and `them`
  segment durations, calculate the rep ratio as `me / (me + them)`. Return a
  `talkTimeAlert` when the ratio is strictly greater than `0.65` across a
  finalized call span strictly longer than `90_000` ms. The alert must include
  the observed ratio, the observed span in milliseconds, and the fixed
  thresholds. Return `null` at either boundary (`ratio <= 0.65` or span `<=
  90_000`). Do not use wall-clock time or partial segments.
- **AC-5 — Incremental safety:** Re-evaluating after another finalized segment
  preserves earlier evidence, does not duplicate criteria or risks for the same
  segment id, and does not mutate the input array or segment objects.

## Expected interface

Add the pure module `src/lib/sales/liveDealRisk.ts` with the public seam below:

```ts
export const TALK_TIME_ALERT_RATIO = 0.65;
export const TALK_TIME_ALERT_SUSTAIN_MS = 90_000;

export function evaluateLiveDealRisk(
  segments: readonly TranscriptSegment[],
): LiveDealRiskReport;
```

The returned shapes are:

```ts
type QualificationStatus = "confirmed" | "missing";
type BadgeTone = "green" | "red";

interface LiveQualificationEntry {
  key: "M" | "E" | "DC" | "DP" | "I" | "C";
  status: QualificationStatus;
  badgeTone: BadgeTone;
  evidenceQuote?: string;
}

interface TalkTimeAlert {
  ratio: number;
  sustainedMs: number;
  thresholdRatio: typeof TALK_TIME_ALERT_RATIO;
  thresholdMs: typeof TALK_TIME_ALERT_SUSTAIN_MS;
}

interface LiveDealRiskReport {
  qualification: LiveQualificationEntry[];
  healthScore: number;
  momentum: "positive" | "neutral" | "at_risk";
  buyingSignals: DealSignal[];
  risks: DealRisk[];
  talkTimeRatio: { me: number; them: number } | null;
  talkTimeAlert: TalkTimeAlert | null;
}
```

`LiveDealRiskReport` must expose:

- `qualification`: the six MEDDIC entries (`M`, `E`, `DC`, `DP`, `I`, `C`),
  each with `status`, `badgeTone`, and optional `evidenceQuote`;
- `healthScore`, `momentum`, `buyingSignals`, and `risks`;
- `talkTimeRatio` (`{ me, them }` or `null`); and
- `talkTimeAlert` (the threshold-bearing alert object or `null`).

The implementation may reuse `meddic.ts`, `dealSignals.ts`, and
`analysis/delivery.ts`, but callers must use this single seam. Segment identity
is the existing `TranscriptSegment.id`; callers provide the store's latest
replacement for a partial/final id.

## Synthetic fixtures and constraints

- Qualification fixture: a prospect states the business pain, names the CFO as
  budget/sign-off owner, and states SOC-2 as an evaluation requirement.
- High-risk fixture: the prospect says there is no budget, the rep is not the
  decision maker, and the deal is pushed to next quarter while the rep speaks
  for more than 65% of a span longer than 90 seconds.
- Keep the seam pure and synchronous. Do not add timers, `Date.now()`, random
  ids, network calls, LLM calls, React imports, or Tauri imports.
- Preserve current `DealSignal`, `DealRisk`, and `TranscriptSegment` field
  meanings. Risk identifiers must be deterministic within this evaluation.

## Builder execution instructions

1. Implement `src/lib/sales/liveDealRisk.ts` behind the interface above.
2. Wire `LiveScreen`/the live deal-risk surface to the report so badge colors,
   momentum, and the talk-time warning come from the seam; do not duplicate
   keyword or ratio rules in JSX.
3. Run the red-bar gate first, then the gate again after implementation:

   ```sh
   npx vitest run src/lib/sales/liveDealRisk.test.ts
   ```

4. Run the existing sales tests and the frontend typecheck before QA handoff.

## Red-bar gate

`src/lib/sales/liveDealRisk.test.ts` is committed with this contract. Before
the builder implementation it fails because the required `liveDealRisk`
interface does not exist; after implementation it must pass deterministically
against the two synthetic transcript fixtures and threshold cases.
