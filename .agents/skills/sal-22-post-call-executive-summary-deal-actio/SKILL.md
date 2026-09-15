---
name: sal-22-post-call-executive-summary-deal-actio
description: Milestone 8: Executive Deal Memo
---

# SAL-22: Post-Call Executive Summary & Deal Action Memo Generator

## 1. Problem Context & Business Goal
## Milestone 8: Executive Deal Memo

Automatically drafts the executive follow-up email and internal deal risk memo within 15 seconds of call completion.

## Commercial Rationale
Deals are won in the speed and precision of the follow-up. Generates a client-facing recap (<150 words) focused strictly on commitments made, plus an internal deal health grade for sales leadership.

## Acceptance Criteria
1. Generates prospect-ready executive recap within 15s of call end.
2. Highlights: agreed problems, proposed solution, timeline, and exact mutual action plan.
3. Generates internal deal risk assessment highlighting missing MEDDIC components or discount exposure.
4. Provides 1-click copy-to-clipboard and email client launcher.

## 2. Proven Architecture & Implementation Pattern
Key architectural deliverables and components implemented in SAL-22. Verified in test suite.

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
Preserve established interfaces, avoid regressions in live stream listeners, and ensure clean test environment cleanup.

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm test:run && pnpm -r typecheck
```
