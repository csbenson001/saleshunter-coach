---
name: competitive-battlecard-killcards
description: Instantly identify competitor mentions (Gong, Clari, Outreach, Salesloft) in live audio transcripts and inject concise 2-sentence objection killcards.
---

# Real-Time Competitor Detection & Objection Killcards

## 1. Problem Context & Business Goal
When a prospect says "We already use Gong and Clari", reps freeze or get defensive. The engine identifies competitor named entities and surfaces asymmetric differentiation killcards in <2 seconds.

## 2. Proven Architecture & Implementation Pattern
- **Competitor Entity Detection** in `src/lib/sales/battlecards.ts`:
  - Entity matching across major sales tech competitors.
- **Killcard Structure**:
  - 1. Acknowledge & Reframe: *"Gong is great for post-call recording; SalesHunter lives in-call during the conversation."*
  - 2. Trap Setting Question: *"Are your reps closing more deals today, or just spending 2 hours reviewing calls after they lose?"*

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
- **No Defensive Bashing**: Never generate negative attacks against competitors; always pivot to asymmetric value (live in-call vs passive post-call).

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm vitest run src/lib/sales/__tests__/battlecards.test.ts && npx tsc --noEmit
```
