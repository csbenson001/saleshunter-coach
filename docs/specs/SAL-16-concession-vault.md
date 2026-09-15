# SAL-16 — The Concession Vault: Real-Time Discount Defense & Trade-Off Matrix

## Scope

This contract covers the synchronous frontend seam that turns a finalized buyer
utterance into a small, deterministic set of give-to-get trade cards. It also
covers the existing in-call concession HUD's reachable card-selection seam.
It does not add an LLM call, transcription provider, native audio-capture
dependency, pricing calculation, or CRM write.

## Acceptance criteria

- **AC-1 — Detect concession pressure:** `detectConcessionPressure` returns a
  cue for each of these buyer intents, case-insensitively and regardless of
  surrounding punctuation: a price objection such as `too expensive`, an
  explicit discount request such as `give us 20% off`, and a budget-relief
  request such as `need budget relief`. The cue includes the matched intent and
  `detected: true`. Empty, unrelated, and rep-side text is outside this pure
  seam and must not be passed as buyer text by callers.

- **AC-2 — No false pressure cue:** Normal discovery text such as
  `How does the Zoom integration work?` returns `null` (or an equivalent cue
  with `detected: false`) and no trade options.

- **AC-3 — Exactly three canonical trades:** Every detected pressure cue
  exposes exactly these three trade archetypes, once each, in this order:

  1. **Payment terms:** 5% discount in exchange for Net-15 payment terms.
  2. **Contract duration:** 10% discount in exchange for a 24-month upfront
     agreement.
  3. **Marketing value:** 5% discount in exchange for a quarterly co-marketing
     case study and reference calls.

  The percentages, duration, payment term, and marketing commitments are
  structured fields, not text-only promises, so the HUD cannot accidentally
  display an unreciprocated discount.

- **AC-4 — Stable, UI-independent public seam:** The engine is synchronous and
  pure for the same input. It does not import React or Tauri, call a network or
  LLM service, use wall-clock time in its result, mutate input, or emit random
  identifiers. The returned option IDs are stable literals:
  `payment_terms`, `contract_duration`, and `marketing_value`.

- **AC-5 — Detection budget:** Pressure detection and cue construction complete
  within 1,500 ms on the frontend runtime. The red-bar test uses a monotonic
  elapsed-time measurement around the public call and also asserts that all
  three options are present.

- **AC-6 — One-click HUD selection:** Each displayed trade card is a semantic
  `<button>` with `data-testid="concession-trade-card"` and a stable trade ID.
  Activating a card once calls `onTradeSelected` with that trade and visibly
  marks it selected. Selection must not copy text, dismiss the HUD, or require a
  second click.

- **AC-7 — Render timing:** A detected cue is handed to the HUD immediately;
  the first render/commit of its three cards must be below the 1,500 ms product
  budget. The existing HUD measurement seam may be used for this check; no
  sleep, timer, network request, or LLM call is permitted on the render path.

## Expected engine interface

Add `src/lib/sales/concessionVault.ts` with this public seam:

```ts
export type ConcessionPressureIntent =
  | "too_expensive"
  | "discount_request"
  | "budget_relief";

export type ConcessionTradeId =
  | "payment_terms"
  | "contract_duration"
  | "marketing_value";

export interface ConcessionTradeOption {
  id: ConcessionTradeId;
  discountPercent: 5 | 10;
  give: string;
  get: string;
  label: string;
}

export interface ConcessionVaultCue {
  detected: true;
  intent: ConcessionPressureIntent;
  matchedPhrase: string;
  tradeOptions: readonly [
    ConcessionTradeOption,
    ConcessionTradeOption,
    ConcessionTradeOption,
  ];
}

export function detectConcessionPressure(
  buyerUtterance: string,
): ConcessionVaultCue | null;
```

The canonical options must be literals at the engine seam:

```ts
[
  {
    id: "payment_terms",
    discountPercent: 5,
    give: "5% discount",
    get: "Net-15 payment terms",
  },
  {
    id: "contract_duration",
    discountPercent: 10,
    give: "10% discount",
    get: "24-month upfront agreement",
  },
  {
    id: "marketing_value",
    discountPercent: 5,
    give: "5% discount",
    get: "Quarterly co-marketing case study & reference calls",
  },
]
```

`label` may be optimized for glanceability, but `id`, `discountPercent`,
`give`, and `get` must preserve these exact values/meaning.

## Expected HUD change

Extend `ConcessionTradeHUD` so its existing `concession` prop can expose the
canonical options and add:

```ts
onTradeSelected?: (trade: ConcessionTradeOption) => void;
```

The three cards must use the canonical `id` as their stable DOM identity and
invoke the callback on the first activation. The caller may adapt the existing
`ConcessionDemand` shape, but it must not reimplement pressure matching or
invent a second trade matrix in JSX.

## Builder execution instructions

1. Implement `src/lib/sales/concessionVault.ts` behind the engine interface.
2. Replace or adapt the legacy discount recommendations at the live concession
   surface so the cue uses the canonical three options.
3. Update `src/components/sales/ConcessionTradeHUD.tsx` to render semantic,
   one-click trade buttons and report selection through `onTradeSelected`.
4. Run the red-bar gates first, then rerun them after implementation:

   ```sh
   npm test -- src/lib/sales/concessionVault.test.ts src/components/sales/ConcessionTradeHUD.test.tsx
   ```

5. Run the existing sales tests and frontend typecheck before QA handoff. Do
   not modify unrelated concurrent work in the shared workspace.

## Red-bar gate

- `src/lib/sales/concessionVault.test.ts` is the engine contract gate. It is
  committed before the implementation and initially fails because the required
  `concessionVault` module does not exist.
- `src/components/sales/ConcessionTradeHUD.test.tsx` is the interaction gate.
  It initially fails because the current HUD renders trade cards as clickable
  `<div>` elements and has no selection callback.
