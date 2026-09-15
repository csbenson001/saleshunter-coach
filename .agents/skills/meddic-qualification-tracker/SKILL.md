---
name: meddic-qualification-tracker
description: Track MEDDIC/MEDDPICC deal qualification signals in real-time during sales calls, detect unverified criteria, and alert reps before calls conclude.
---

# Real-Time MEDDPICC Qualification Tracker & Gap Analysis

## 1. Problem Context & Business Goal
Reps finish discovery calls missing critical criteria (Economic Buyer, Decision Criteria, Paper Process). The tracker continuously evaluates transcript evidence against the 8 MEDDPICC dimensions and prompts reps with subtle gap questions when 5 minutes remain in scheduled call duration.

## 2. Proven Architecture & Implementation Pattern
- **MEDDPICC Dimension Matrix** in `src/lib/sales/meddicTracker.ts`:
  - Metrics (M), Economic Buyer (EB), Decision Criteria (DC), Decision Process (DP), Paper Process (PP), Identify Pain (IP), Champion (C), Competition (COMP).
- **Evidence Confidence Scoring**:
  - Each dimension maintains: `status: 'unverified' | 'inferred' | 'validated'`, `confidenceScore: 0..100`, and exact quote snippet evidence.
- **End-of-Call Gap Prompts**:
  - Auto-calculates weakest score dimensions and generates high-impact discovery pivot questions.

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
- **Over-crediting Passing Mentions**: A prospect saying "our CFO approved budget" is Economic Buyer evidence; saying "I might ask the CFO" is only Pain/Process. Score confidence proportionally.
- **Immutable State Updates**: Ensure state updates preserve prior evidence when incremental transcript chunks arrive.

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm vitest run src/lib/sales/__tests__/meddicTracker.test.ts && npx tsc --noEmit
```
