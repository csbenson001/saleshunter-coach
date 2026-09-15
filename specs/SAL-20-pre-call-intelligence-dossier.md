# SAL-20 — Pre-Call Intelligence Dossier

## Scope

Add a pre-call account dossier that a representative can glance at before a
scheduled sales call, invoke manually, and hand off to the existing live
in-call HUD when recording starts.

The dossier is a presentation surface. It must not mutate the live transcript,
live coaching state, or replay state.

## Acceptance criteria

### AC-1 — Scheduled and manual presentation

1. `PRE_CALL_DOSSIER_LEAD_TIME_MS` is exactly `60_000`.
2. For a scheduled call with `callStartAtMs`, the dossier is eligible when
   `nowMs >= callStartAtMs - 60_000` and `nowMs < callStartAtMs`.
3. One second before that window (`nowMs = callStartAtMs - 60_001`) it is not
   eligible.
4. A manual trigger makes the dossier eligible regardless of the clock, as
   long as the call has not started.
5. A call whose start time has passed is not eligible through either the
   scheduled or manual trigger. The scheduler must not create repeated
   presentations for the same trigger; the host owns de-duplication.

### AC-2 — Required dossier content and glanceability

1. The dossier data contract contains these required fields:
   - `economicBuyerBackground: string`
   - `lastMeetingBlocker: string`
   - `competitorTraps: string[]` (one or more traps)
   - `openingQuestion: string`
2. `PreCallDossierCard` visibly labels and renders all four fields, including
   every competitor trap supplied in the array.
3. The opening question contains fewer than 30 whitespace-delimited words.
   The card must not silently truncate or rewrite it.
4. The card remains readable as a 60-second glance: one compact card, no
   required navigation away from the current sales surface, and no blocking
   network call during rendering.

### AC-3 — Handoff to the live in-call HUD

1. While meeting status is not `recording`, a visible dossier resolves to the
   `pre-call-dossier` surface.
2. When meeting status becomes `recording`, the resolved surface is
   `in-call-nudge-hud`; the pre-call dossier is no longer visible.
3. The handoff must preserve the existing live HUD contract and must not leave
   a second dossier window/card visible after recording starts.
4. Paused, stopped, replay, and idle states must not be treated as an active
   live HUD state by this feature.

## Builder contract

Create the following public seams (names are part of the handoff contract):

```ts
// src/lib/sales/preCallDossier.ts
export const PRE_CALL_DOSSIER_LEAD_TIME_MS: 60_000;

export type PreCallDossier = {
  economicBuyerBackground: string;
  lastMeetingBlocker: string;
  competitorTraps: string[];
  openingQuestion: string;
};

export function shouldPresentPreCallDossier(input: {
  nowMs: number;
  callStartAtMs: number | null;
  manualTrigger: boolean;
}): boolean;

export function resolveSalesCallSurface(input: {
  meetingStatus: "idle" | "pre-call" | "recording" | "paused" | "stopped" | "replay";
  dossierVisible: boolean;
}): "hidden" | "pre-call-dossier" | "in-call-nudge-hud";
```

```tsx
// src/components/sales/PreCallDossierCard.tsx
export function PreCallDossierCard(props: {
  dossier: PreCallDossier;
}): JSX.Element;
```

The builder may add adapters, persistence, calendar integration, and Tauri
window plumbing around these seams. The seams must remain deterministic and
usable in Vitest without Tauri, a calendar provider, an LLM, or network access.

## Required red-bar gate

`src/lib/sales/preCallDossier.contract.test.tsx` is the authoritative failing
test for this issue. It must pass only after the builder implements the public
seams above and wires the card to the existing live HUD lifecycle.

## Verification and handoff

Run:

```sh
npx vitest run src/lib/sales/preCallDossier.contract.test.tsx
```

Specification handoff is valid only with the committed red-bar result recorded
on SAL-20. Builder must turn this test green and add integration coverage for
the actual scheduled/manual trigger host and Tauri/browser presentation path.
