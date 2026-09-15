# SAL-19 — Manager Command & Multi-Seat Whisper Grid

## Scope

Add a manager-only live supervision surface for up to ten active sales calls.
The surface is a read/dispatch view: it must not mutate the rep transcript or
interrupt the meeting audio.

## Acceptance criteria

### AC-1 — Live call command center

1. The manager view renders one card per active call and identifies the rep and
   call with stable `callId` and `repId` values.
2. Every card renders the current rep/prospect talk-time ratio as percentages.
   A call with no ratio renders an explicit unavailable state; it must not show
   `0%` as if that were measured data.
3. Every card renders the currently active objection cards, including their
   title and actionable content. Historical/resolved objections are not shown
   as active.
4. Every card renders six MEDDIC completion pills in the canonical order
   `M`, `E`, `DC`, `DP`, `I`, `C`; each pill has an unambiguous complete or
   incomplete state.
5. The projection accepts 1–10 calls. Passing 11 or more active calls fails
   with a user-visible, deterministic capacity error; calls must never be
   silently dropped.

### AC-2 — One-click targeted whisper

1. The composer is bound to exactly one selected `callId`/`repId` pair. One
   submit action produces exactly one dispatch attempt for that pair.
2. The message is trimmed and must contain at least one and at most 24
   whitespace-delimited words. Blank messages and messages with 25 or more
   words are rejected before transport and do not create an audit entry.
3. A valid dispatch envelope contains a unique whisper `id`, the selected
   `callId`, the selected `repId`, the trimmed message, and the manager-submit
   timestamp in milliseconds.

### AC-3 — Rep HUD delivery SLA

1. The envelope travels over the existing manager-whisper channel and retains
   `callId`/`repId` target metadata. A rep HUD must ignore an envelope for a
   different rep seat.
2. The selected rep HUD renders the message as the existing manager-coaching
   notification with an amber highlight and polite live-region semantics.
3. Delivery is measured from the manager-submit timestamp to the HUD render
   commit. A delivery at exactly 500 ms passes; a delivery over 500 ms fails
   the SLA measurement. The dispatch path must not wait for audio or transcript
   processing.

### AC-4 — Auditable whisper and progression history

1. A successful dispatch creates one immutable audit entry containing the
   whisper id, manager-submit timestamp, target call/rep, and message.
2. A failed transport creates no audit entry.
3. Subsequent deal progression events can be appended to the matching audit
   entry with event id, call id, stage, and timestamp, preserving append order.
   The resulting audit record is suitable for later manager history/CRM export.

## Public domain seam and implementation targets

The red-bar contract lives in
`src/lib/sales/managerCommandCenter.ts` and
`src/lib/sales/managerCommandCenter.test.ts`.

The builder should implement these exports without coupling the domain tests
to React or Tauri internals:

```ts
const MAX_MANAGER_LIVE_CALLS = 10;
const MAX_MANAGER_WHISPER_WORDS = 24;
const MANAGER_WHISPER_DELIVERY_SLA_MS = 500;

buildManagerCommandCenter(calls): readonly ManagerCallCard[];
dispatchManagerWhisper(input, send): Promise<ManagerWhisperAuditEntry>;
recordDealProgression(entry, event): ManagerWhisperAuditEntry;
measureManagerWhisperDelivery(dispatch, renderedAtMs): {
  latencyMs: number;
  withinSla: boolean;
};
```

Use the existing `HudObjectionCard`, `HudWhisperCard`,
`broadcastManagerWhisper`, and `InCallNudgeHudWhisperCommitProbe` seams where
possible. Keep manager transport metadata additive so existing rep HUD
whisper tests remain valid.

## Verification gate

Run:

```sh
npx vitest run src/lib/sales/managerCommandCenter.test.ts
```

This test must be red before implementation and green after the builder’s
vertical slices are complete. The focused test is the handoff gate; the builder
should then run `npm test`, `npm run build`, and `npm run prove` before review.
