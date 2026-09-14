# SAL-1 — In-Call Nudge HUD & Objection Card

## Purpose

Add a small, glanceable live-call HUD that can sit above Zoom, Meet, or Teams
without taking focus or intercepting meeting clicks. The HUD shows the current
objection count and the representative/other-party talk-time split, and can
surface one objection battlecard emitted by the inference pipeline.

The existing `DeliveryNudge`, `talkTimeRatio`, and `matchObjection` primitives
remain the sources of truth. This issue adds the HUD presentation/state boundary;
it does not change audio capture, transcription, or the battlecard corpus.

## Inputs / Outputs

### Required pure module

Create `src/lib/sales/inCallNudgeHud.ts` with these exports:

```ts
export const HUD_CARD_TIMEOUT_MS = 12_000;
export const IN_CALL_NUDGE_HUD_LABEL = "in-call-nudge-hud";

export interface HudTalkTimeRatio {
  me: number;   // 0..1
  them: number; // 0..1
}

export interface HudObjectionCard {
  id: string;
  title: string;
  rebuttalScript: string;
  followUpQuestion: string;
}

export interface InCallHudState {
  objectionCount: number;
  talkTimeRatio: HudTalkTimeRatio | null;
  card: HudObjectionCard | null;
  cardExpiresAtMs: number | null;
}

export type InCallHudEvent =
  | { type: "metrics"; objectionCount: number; talkTimeRatio: HudTalkTimeRatio | null }
  | { type: "objection-card"; card: HudObjectionCard }
  | { type: "dismiss-card" }
  | { type: "tick" };

export function initialInCallHudState(): InCallHudState;
export function reduceInCallHudState(
  state: InCallHudState,
  event: InCallHudEvent,
  nowMs: number,
): InCallHudState;

export interface InCallHudWindowOptions {
  transparent: true;
  decorations: false;
  alwaysOnTop: true;
  skipTaskbar: true;
  resizable: false;
  focus: false;
  clickThrough: true;
}

export function inCallHudWindowOptions(): InCallHudWindowOptions;
```

The reducer is synchronous and framework-free. `nowMs` is supplied by the
caller so expiry tests do not depend on real timers.

### Window and UI integration

The builder must add a Tauri secondary window labelled
`IN_CALL_NUDGE_HUD_LABEL`, created only while a meeting is recording. It must
use `inCallHudWindowOptions()` and be mounted to a dedicated route/component,
not the main meeting window. The default window state is click-through and
non-focusing. If an interactive affordance is provided, it must temporarily
disable click-through before accepting the interaction and restore it after the
interaction; the meeting window must never receive focus as a side effect.

The React card must render the battlecard title, rebuttal script, and follow-up
question, plus a dismiss action. Percentages are displayed as rounded whole
numbers (`me * 100` and `them * 100`). A `null` talk-time ratio renders an
explicit unavailable state rather than `NaN`, `Infinity`, or a fabricated split.

## Acceptance criteria

1. **AC-1 — Overlay window contract:** `inCallHudWindowOptions()` returns exactly
   transparent `true`, decorations `false`, always-on-top `true`, skip-taskbar
   `true`, resizable `false`, focus `false`, and click-through `true`.

2. **AC-2 — Meeting-only lifecycle:** the Tauri HUD window is created/shown only
   when meeting status is `recording`, is hidden/destroyed when recording ends,
   and does not replace or mutate the main meeting window configuration.

3. **AC-3 — Live metrics:** every metrics event replaces the state with the
   supplied objection count and talk-time ratio while preserving any currently
   visible card. The UI displays both values; a null ratio is shown as
   unavailable.

4. **AC-4 — Card content:** an objection-card event makes exactly one card
   visible with the supplied id, title, rebuttal script, and follow-up question.
   A replacement event replaces the previous card rather than stacking cards.

5. **AC-5 — Inference-to-HUD latency boundary:** the inference event handler and
   reducer are synchronous (no network request, debounce, or timer before the
   card enters render state). The card component records an emission-to-commit
   measurement; the builder must verify a 100-event local replay has a p95
   emission-to-commit time below 100 ms on the supported development machine.

6. **AC-6 — Automatic expiry:** a visible card has an expiry timestamp exactly
   `emissionTime + 12_000` ms. A tick before that timestamp keeps it visible; a
   tick at or after it clears both `card` and `cardExpiresAtMs`.

7. **AC-7 — Interaction dismissal:** the dismiss action (or equivalent explicit
   card interaction) clears the card immediately, regardless of remaining time,
   and a later tick cannot restore it.

8. **AC-8 — Deterministic gate:** the committed Vitest file
   `src/lib/sales/inCallNudgeHud.test.ts` passes once the above pure contract is
   implemented and fails before implementation because the required module and
   behavior do not yet exist.

## Execution instructions

1. Start with the committed red-bar test. Implement the pure module at the exact
   path and exports above; keep it free of React, Tauri, timers, and globals.
2. Add the React surface at
   `src/components/sales/InCallNudgeHud.tsx`. Use existing i18n indirection for
   all user-facing strings and keep the component small enough for the HUD's
   glanceability requirement.
3. Add the Tauri lifecycle/window bridge in a focused module under
   `src/lib/sales/` (and the smallest required Rust/native hook if Tauri lacks a
   direct click-through API). Do not put overlay state in `src-tauri`.
4. Connect inference output from the existing objection matcher/analysis event
   path and metrics from the existing live store. Do not duplicate battlecard
   matching or talk-time calculation.
5. Run `bunx vitest run src/lib/sales/inCallNudgeHud.test.ts`, then the full
   `bunx vitest run` and `bunx tsc --noEmit`. Verify the p95 latency measurement
   and meeting-only lifecycle on a Tauri macOS run before handoff.

## Out of scope

- Changing objection trigger phrases, rebuttal copy, LLM prompts, or inference
  provider behavior.
- Reworking the existing delivery nudge logic or replacing the main live feed.
- Windows/Linux native overlay parity in this issue; keep the pure contract
  portable, but validate the native click-through behavior on macOS.
- Persisting HUD cards or metrics after a meeting ends.
