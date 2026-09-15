---
name: sal-19-manager-live-telemetry-command-center-
description: Milestone 5: Manager Command & Multi-Seat HUD
---

# SAL-19: Manager Live Telemetry Command Center & Multi-Seat Whisper Grid

## 1. Problem Context & Business Goal
## Milestone 5: Manager Command & Multi-Seat HUD

Build the manager-facing live supervision and whisper dispatch interface.

## Commercial Rationale
Allows enterprise sales managers to monitor up to 10 live sales calls concurrently and inject 1-line tactical nudges directly onto a rep's transparent HUD in real time without interrupting the conversation.

## Acceptance Criteria
1. Manager view displaying active calls with live talk-time ratios, active objection cards, and MEDDIC completion pills.
2. Whisper composer allowing 1-click transmission of a glanceable cue (<25 words) to a specific rep.
3. Rep HUD receives and renders manager whisper within 500ms of dispatch with amber highlight.
4. Audit log tracking manager whisper timestamps and subsequent deal progression.

## 2. Proven Architecture & Implementation Pattern
Key architectural deliverables and components implemented in SAL-19. Verified in test suite.

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
Preserve established interfaces, avoid regressions in live stream listeners, and ensure clean test environment cleanup.

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm test:run && pnpm -r typecheck
```
