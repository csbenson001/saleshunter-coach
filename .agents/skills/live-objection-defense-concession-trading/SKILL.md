---
name: live-objection-defense-concession-trading
description: Detect pricing pushbacks and discount demands in real-time streaming audio transcripts and surface non-monetary value trades adhering to the <3s glanceability rule.
---

# Live In-Call Objection Buster & Concession Defense Engine

## 1. Problem Context & Business Goal
When a prospect asks for discounts (e.g. "Can we get 20% off?"), reps fold and give away margin. The engine detects pricing objections in streaming transcripts, matches against a concession matrix, and surfaces immediate value trades (annual upfront, multi-year, case study commitment) in <25 words within 3 seconds.

## 2. Proven Architecture & Implementation Pattern
- **Streaming Transcript Ingestion**:
  - `src/lib/sales/objectionBuster.ts`: Regex and semantic pattern matchers against prospect utterance streams.
  - `src/lib/sales/concessionMatrix.ts`: Rule engine pairing discount percentage demands to required non-monetary trades.
- **Glanceability Rule Enforcement**:
  - All generated counter-cues must be strictly <25 words with zero conversational preamble.
  - Formatted as instant pivot scripts with clear action buttons:
    - Example: *"Trade 20% discount for 2-year upfront commitment + customer reference call."*
- **State Integration**:
  - Connects objection detector output to HUD host queue (`useInCallNudgeHudHost.ts`) with `tradeOptions` array on `HudObjectionCard`.

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
- **False Positive Audio Triggers**: Phrases like "we don't want a discount, we want speed" should not trigger concession defenses. Match negation boundaries before firing objection cards.
- **Card Flooding**: Suppress duplicate objection triggers for the same demand within a 15-second debounce window.
- **Trade Option Ordering**: Always surface the highest value trade (payment terms & multi-year) first before secondary concessions (case studies).

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm vitest run src/lib/sales/__tests__/objectionBuster.test.ts src/lib/sales/__tests__/concessionMatrix.test.ts && npx tsc --noEmit
```
