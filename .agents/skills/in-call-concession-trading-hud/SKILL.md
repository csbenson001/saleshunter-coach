---
name: in-call-concession-trading-hud
description: Wire live concession trade options directly into the transparent HUD overlay so reps can click-to-copy or click-to-speak counter-trades during active negotiations.
---

# In-Call Concession Defense Card HUD Integration

## 1. Problem Context & Business Goal
Surfacing objections is useless if the rep cannot see the exact trade script on the transparent HUD. This pattern integrates the concession defense engine into the HUD host and objection card UI.

## 2. Proven Architecture & Implementation Pattern
- Wire `tradeOptions` into `HudObjectionCard` interface in `src/lib/sales/inCallNudgeHud.ts`.
- In `src/lib/sales/useInCallNudgeHudHost.ts`, subscribe to transcript events, detect concession triggers, and push rich objection cards with trade pills.
- Render trade options in HUD with 1-click clipboard copy and glanceable badge styling.

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
- Ensure window ignore cursor events does not block clicking trade pill buttons.

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm vitest run src/lib/sales/__tests__/inCallNudgeHudHost.test.ts && npx tsc --noEmit
```
