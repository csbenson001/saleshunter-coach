---
name: sal-21-direct-salesforce-hubspot-live-oauth-c
description: Milestone 7: Zero-Click CRM Sync
---

# SAL-21: Direct Salesforce & HubSpot Live OAuth Connector

## 1. Problem Context & Business Goal
## Milestone 7: Zero-Click CRM Sync

Build the direct API sync connector for Salesforce (Opportunity/Task) and HubSpot (Deals/Engagements).

## Commercial Rationale
Eliminates 30 minutes of daily post-call admin overhead per rep. Guarantees that MEDDIC qualification data, objection notes, and agreed concessions immediately update CRM forecast stages.

## Acceptance Criteria
1. OAuth2 credential handshake and token refresh flow for Salesforce and HubSpot.
2. 1-click sync pushes structured meeting notes, MEDDIC scores, objection outcomes, and next steps.
3. Auto-associates deal records with attendees using email matching.
4. Emits clear success/failure toast with retry affordance.

## 2. Proven Architecture & Implementation Pattern
Key architectural deliverables and components implemented in SAL-21. Verified in test suite.

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
Preserve established interfaces, avoid regressions in live stream listeners, and ensure clean test environment cleanup.

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm test:run && pnpm -r typecheck
```
