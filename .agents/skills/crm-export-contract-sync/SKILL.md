---
name: crm-export-contract-sync
description: Synthesize structured MEDDPICC deal summaries, next steps, and field mappings into standard JSON/Markdown ready for Salesforce and HubSpot API synchronization.
---

# Local-First CRM Deal Memo & Contract Export Pipeline

## 1. Problem Context & Business Goal
Reps waste 30-45 minutes post-call manually logging notes into Salesforce/HubSpot. The export engine produces clean, structured deal memos, extracted action items, and field mapping payloads immediately upon call completion with zero plain text credential leakage.

## 2. Proven Architecture & Implementation Pattern
- **Deal Memo Synthesis** in `src/lib/sales/crmExport.ts`:
  - Generates standardized executive summaries, MEDDIC scorecards, competitor mentions, and agreed next steps with owners and due dates.
- **Provider Adapters**:
  - Salesforce REST API mapper (`Opportunity`, `Task`, `Note`)
  - HubSpot Deals/Engagements mapper
- **Security & Privacy Boundary**:
  - Local-first processing: transcripts never touch external servers without explicit user sync click.

## 3. Critical Gotchas, Pitfalls & Anti-Patterns
- **Empty Field Pollution**: Strip undefined/null CRM custom fields to avoid Salesforce API rejection (`INVALID_FIELD_FOR_INSERT_UPDATE`).
- **Date Parsing**: Format action item due dates strictly as ISO 8601 (`YYYY-MM-DD`).

## 4. Verification Recipe
Run the following command to verify the implementation pattern:
```bash
pnpm vitest run src/lib/sales/__tests__/crmExport.test.ts && npx tsc --noEmit
```
