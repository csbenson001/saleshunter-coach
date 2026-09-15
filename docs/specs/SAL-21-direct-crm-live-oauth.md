# SAL-21: Direct Salesforce & HubSpot Live OAuth Connector

## Scope

Add a provider-neutral live CRM connector at `src/lib/sales/crmLiveSync.ts`.
It may reuse `buildSalesforcePayload` and `buildHubSpotPayload` from
`src/lib/sales/crmExport.ts`, but the live connector owns OAuth, token refresh,
provider API calls, attendee matching, and sync result/error reporting.

The connector must not read credentials from `localStorage`, Zustand
persisted state, or URL query strings after the OAuth callback. The caller
provides a credential store backed by the platform secure store.

## Public contract

The builder must export:

```ts
type CrmProvider = "salesforce" | "hubspot";

interface CrmSyncMeeting {
  title: string;
  date: string;
  summary: string[];
  actionItems: string[];
  meddicStatus: Record<string, boolean>;
  objectionOutcomes: Array<{ objection: string; outcome: string; note?: string }>;
  agreedConcessions: string[];
  nextSteps: string[];
  attendees: Array<{ name?: string; email: string }>;
  salesforceOpportunityId?: string;
  hubspotDealId?: string;
}

interface CrmCredential {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch milliseconds
  instanceUrl?: string; // required for Salesforce
}

interface CrmCredentialStore {
  get(provider: CrmProvider): Promise<CrmCredential | null>;
  set(provider: CrmProvider, credential: CrmCredential): Promise<void>;
  clear(provider: CrmProvider): Promise<void>;
}

interface CrmSyncNotifier {
  success(message: string): void;
  failure(message: string, retry: () => Promise<void>): void;
}

interface CrmLiveConnector {
  beginOAuth(provider: CrmProvider): { authorizationUrl: string; state: string };
  completeOAuth(
    provider: CrmProvider,
    callback: { code: string; state: string },
  ): Promise<CrmCredential>;
  sync(
    provider: CrmProvider,
    meeting: CrmSyncMeeting,
    notifier?: CrmSyncNotifier,
  ): Promise<CrmSyncResult>;
}

interface CrmSyncResult {
  provider: CrmProvider;
  opportunityOrDealId: string;
  activityId: string;
  matchedAttendeeEmails: string[];
}
```

`createCrmLiveConnector` must accept the credential store, provider client
IDs, redirect URI, and injectable `fetch`, `now`, and state factory seams.
Production code supplies cryptographic state generation and the secure-store
implementation; tests supply deterministic fakes. The connector must not
make browser, Tauri, or network calls at module import time.

## Acceptance criteria

### AC-1 — OAuth handshake and refresh

1. `beginOAuth("salesforce")` uses Salesforce's authorize endpoint and
   `beginOAuth("hubspot")` uses HubSpot's OAuth endpoint. Both URLs include
   the configured client ID, redirect URI, response type `code`, and a
   provider-appropriate scope set. Each request gets a non-empty state value.
2. `completeOAuth` rejects a missing, mismatched, or already-consumed state
   before making a token request. State is single-use per provider.
3. A valid callback exchanges the code with the provider token endpoint using
   a form-encoded POST, persists the access token, refresh token, and expiry,
   and preserves Salesforce's `instance_url`.
4. `sync` refreshes a credential when it is expired or expires within the
   configured safety window. A single 401 response may trigger one refresh
   and one replay; a second 401 fails without looping. Refreshed credentials
   are persisted before the replay.

### AC-2 — One-click structured sync

1. Salesforce sync creates or updates an Opportunity and creates a Task. The
   Task links to the Opportunity and contains the meeting title/date/summary,
   all MEDDIC statuses, every objection outcome, agreed concession, and next
   step. If `salesforceOpportunityId` is supplied, the existing Opportunity
   is updated rather than creating a duplicate.
2. HubSpot sync creates or updates a Deal and creates a CRM engagement note.
   The note is associated with the Deal and contains the same structured
   meeting fields. If `hubspotDealId` is supplied, the existing Deal is
   updated rather than creating a duplicate.
3. A successful result returns the provider, the resulting Deal/Opportunity
   ID, the activity/note ID, and the normalized attendee emails that matched.
4. Payloads contain no access token, refresh token, authorization code, or
   client secret.

### AC-3 — Attendee email association

1. Before writing the activity, the connector searches the provider's Contact
   records by attendee email. Matching is case-insensitive and trims
   whitespace; duplicate input emails are searched once.
2. Only contacts returned by an exact email match are associated. An
   unmatched attendee does not fail the sync and is not associated with an
   unrelated record.
3. Salesforce associates matched Contacts to the Task (`WhoId`); HubSpot
   associates matched Contacts to the Deal and engagement note using the
   provider's supported association API.

### AC-4 — Explicit success/failure feedback with retry

1. On success, the optional notifier receives a concise success message that
   names the provider and includes the number of matched attendees.
2. On a non-auth sync failure, the optional notifier receives the provider
   error message and a retry callback. Invoking retry repeats the sync with
   the same meeting data and returns the eventual result; it does not restart
   OAuth or require the user to re-enter credentials.
3. Auth failures clear the unusable credential and report that reconnect is
   required; they do not offer an infinite retry loop.

## Execution instructions

- Implement the public types and factory in `src/lib/sales/crmLiveSync.ts`.
- Keep HTTP, token storage, and notification as injected seams. Do not call
  real Salesforce or HubSpot endpoints from unit tests.
- Use the existing `src/lib/sales/crmExport.ts` payload builders as the source
  for common meeting-note formatting, extending the structured input where
  needed for objection outcomes, concessions, next steps, and attendees.
- The UI integration belongs at the existing CRM export entry point,
  `src/components/sales/CrmExportModal.tsx`, and must map connector results and
  errors to the existing Sonner toast wrapper. The retry action must call the
  connector with the same immutable meeting snapshot.
- Persist OAuth credentials through the Tauri secure-store boundary; never
  persist CRM credentials in frontend storage.
- The required red gate is
  `src/lib/sales/crmLiveSync.contract.test.ts`. Run it directly with:
  `npx vitest run src/lib/sales/crmLiveSync.contract.test.ts`.
- The test must pass without credentials, browser access, Tauri, or network
  access once the implementation is complete.

## Out of scope

- CRM schema/admin configuration, custom field mapping, bulk historical sync,
  webhook subscriptions, and background auto-sync.
- Creating or editing OAuth client registrations in Salesforce or HubSpot.
