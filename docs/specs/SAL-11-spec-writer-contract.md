# SAL-11 — Live In-Call Objection Buster & Concession Defense Engine

## Scope

This contract covers the deterministic application boundary between the live
transcript stream and the in-call commercial cue surface. Native capture,
Tauri events, and the LLM/STT providers remain external boundaries. The
builder must connect the existing transcript store/event path to the reducer
below and then map its cue into the existing in-call HUD.

## Acceptance criteria

- **AC-1 — Final prospect utterances only:** A final `TranscriptSegment` whose
  source is `them` or `mix` is eligible for matching. Partial segments,
  `me` segments, empty text, and a repeated segment id produce no new cue and
  do not increment `objectionCount`.
- **AC-2 — Objection and concession routing:** A recognized objection is
  matched through `matchObjection` and reports `engine: "objectionBuster"`.
  Pricing objections and discount requests such as `Can we get a 20% discount?`
  are recognized through `matchConcessionTrade` and report
  `engine: "concessionMatrix"` with `kind: "concession"`.
- **AC-3 — Value-for-value trades:** A discount cue exposes all three immediate
  non-monetary trade families in `tradeOptions`: payment terms/pre-pay,
  multi-year commitment, and case-study/customer-reference commitment. The
  cue must not offer an unearned price reduction.
- **AC-4 — Glanceability:** The user-visible `script` on every cue contains
  fewer than 25 whitespace-delimited words and none of these conversational
  fillers: `look`, `honestly`, `just`, `you know`, `obviously`, or
  `unfortunately` (case-insensitive). No network request, debounce, timer, or
  LLM call may occur before the reducer returns the cue.
- **AC-5 — Replacement semantics:** Each newly matched final segment increments
  `objectionCount` by one and replaces the current cue with one cue. An
  unrelated segment preserves the current cue; repeated delivery of the same
  segment id is idempotent.

## Expected interface

Create `src/lib/sales/liveObjectionDefense.ts` with these exports:

```ts
import type { TranscriptSegment } from "../types";

export interface LiveObjectionDefenseCue {
  id: string;
  kind: "objection" | "concession";
  engine: "objectionBuster" | "concessionMatrix";
  title: string;
  script: string;
  tradeOptions: string[];
}

export interface LiveObjectionDefenseState {
  processedSegmentIds: string[];
  objectionCount: number;
  cue: LiveObjectionDefenseCue | null;
}

export function initialLiveObjectionDefenseState(): LiveObjectionDefenseState;

export function reduceLiveObjectionDefense(
  state: LiveObjectionDefenseState,
  segment: TranscriptSegment,
): LiveObjectionDefenseState;
```

`reduceLiveObjectionDefense` is synchronous and framework-free. It must use the
existing `matchObjection` and `matchConcessionTrade` engines rather than
copying their phrase lists. For each eligible segment, concession matching
takes precedence over the general budget objection match so a request for a
discount produces trade choices. `tradeOptions` should contain concise labels
or phrases suitable for immediate rendering, not the long diagnostic fields
from the matrix.

## Red-bar gate

The committed test is
`src/lib/sales/liveObjectionDefense.test.ts`. It must fail before the module
exists and pass after the reducer and transcript wiring are implemented:

```sh
npx vitest run src/lib/sales/liveObjectionDefense.test.ts
```

After the focused gate is green, run the frontend suite and typecheck. The
builder should also verify one real Tauri recording path: a final
`transcript://segment` event must reach the reducer without waiting for the
next segment or an LLM response, and recording shutdown must stop producing
new cues.

## Builder constraints

1. Keep the reducer free of React, Zustand, Tauri imports, timers, network
   calls, `Date.now()`, and provider calls.
2. Preserve existing `InCallNudgeHud` lifecycle and click-through behavior;
   this issue changes the cue source, not the native window contract.
3. Do not surface a raw long counterpunch paragraph as the live script. If the
   existing matrix copy exceeds AC-4, add a concise live script at the
   application boundary while retaining the matrix's detailed copy for
   replay/debrief surfaces.
4. Keep transcript segment ids as the deduplication key. Do not deduplicate by
   text, timestamp, or wall-clock arrival time.
