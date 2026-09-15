---
name: sal-20-pre-call-intelligence-dossier-60s-glan
description: Milestone 6: Pre-Call Account Dossier
---

# SAL-20: Pre-Call Intelligence Dossier (60s Glanceable Battlecard)

## 1. Problem Context & Business Goal
## Milestone 6: Pre-Call Account Dossier

Build the automated pre-call briefing card that pops 60 seconds before scheduled calls.

## Commercial Rationale
Eliminates rep call-prep failure. Ensures every quota-carrying rep walks into a meeting armed with the Economic Buyer profile, previous deal blockers, competitor traps to avoid, and a tailored opening hook.

## Acceptance Criteria
1. Pops pre-call dossier card 60s before call start or on manual trigger.
2. Contains: (a) Economic Buyer background, (b) Key deal blocker from last meeting, (c) Competitor traps to avoid, (d) High-converting opening question (<30 words).
3. Smoothly transitions into the live in-call HUD overlay when meeting starts.

## 2. Proven Architecture & Implementation Pattern
Key architectural deliverables and components implemented in SAL-20. Verified in test suite.

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
Preserve established interfaces, avoid regressions in live stream listeners, and ensure clean test environment cleanup.

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm test:run && pnpm -r typecheck
```
