export type CrmProvider = "salesforce" | "hubspot";

export interface CrmSyncMeeting {
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

export interface CrmCredential {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  instanceUrl?: string;
}

export interface CrmCredentialStore {
  get(provider: CrmProvider): Promise<CrmCredential | null>;
  set(provider: CrmProvider, credential: CrmCredential): Promise<void>;
  clear(provider: CrmProvider): Promise<void>;
}

export interface CrmSyncNotifier {
  success(message: string): void;
  failure(message: string, retry: () => Promise<void>): void;
}

export interface CrmSyncResult {
  provider: CrmProvider;
  opportunityOrDealId: string;
  activityId: string;
  matchedAttendeeEmails: string[];
}

export interface CrmLiveConnector {
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

export interface CrmLiveConnectorOptions {
  credentialStore: CrmCredentialStore;
  clientIds: Record<CrmProvider, string>;
  redirectUri: string;
  fetch?: typeof fetch;
  now?: () => number;
  stateFactory?: () => string;
  refreshSafetyWindowMs?: number;
}

const SALESFORCE_AUTHORIZE_URL = "https://login.salesforce.com/services/oauth2/authorize";
const SALESFORCE_TOKEN_URL = "https://login.salesforce.com/services/oauth2/token";
const HUBSPOT_AUTHORIZE_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";
const SALESFORCE_API_VERSION = "v61.0";
const DEFAULT_REFRESH_SAFETY_WINDOW_MS = 60_000;

const scopes: Record<CrmProvider, string> = {
  salesforce: "api refresh_token offline_access",
  hubspot: [
    "crm.objects.contacts.read",
    "crm.objects.deals.read",
    "crm.objects.deals.write",
    "crm.objects.notes.write",
  ].join(" "),
};

class CrmHttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CrmHttpError";
    this.status = status;
  }
}

class CrmAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmAuthError";
  }
}

function defaultStateFactory(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (globalThis.crypto?.getRandomValues) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function providerName(provider: CrmProvider): string {
  return provider === "salesforce" ? "Salesforce" : "HubSpot";
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

function uniqueAttendeeEmails(meeting: CrmSyncMeeting): string[] {
  return [...new Set(meeting.attendees.map((attendee) => normalizedEmail(attendee.email)).filter(Boolean))];
}

function meetingNotes(meeting: CrmSyncMeeting): string {
  const lines = [
    "=== SALESHUNTER COACH MEETING NOTE ===",
    `Meeting: ${meeting.title}`,
    `Date: ${meeting.date}`,
    "",
    "Summary:",
    ...meeting.summary.map((item) => `- ${item}`),
    "",
    "Action Items:",
    ...meeting.actionItems.map((item) => `- ${item}`),
    "",
    "MEDDIC:",
    ...Object.entries(meeting.meddicStatus).map(([field, confirmed]) => `${field}: ${confirmed ? "Confirmed" : "Pending"}`),
    "",
    "Objection Outcomes:",
    ...meeting.objectionOutcomes.map(({ objection, outcome, note }) => `- ${objection}: ${outcome}${note ? ` — ${note}` : ""}`),
    "",
    "Agreed Concessions:",
    ...meeting.agreedConcessions.map((item) => `- ${item}`),
    "",
    "Next Steps:",
    ...meeting.nextSteps.map((item) => `- ${item}`),
  ];
  return lines.join("\n");
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return { message: text };
  }
}

function responseMessage(body: Record<string, unknown>, status: number): string {
  const message = body.message ?? body.error_description ?? body.error;
  return typeof message === "string" && message.trim() ? message : `CRM request failed with status ${status}`;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) throw new Error(`CRM token response did not include ${field}`);
  return value;
}

function cloneMeeting(meeting: CrmSyncMeeting): CrmSyncMeeting {
  return {
    ...meeting,
    summary: [...meeting.summary],
    actionItems: [...meeting.actionItems],
    meddicStatus: { ...meeting.meddicStatus },
    objectionOutcomes: meeting.objectionOutcomes.map((outcome) => ({ ...outcome })),
    agreedConcessions: [...meeting.agreedConcessions],
    nextSteps: [...meeting.nextSteps],
    attendees: meeting.attendees.map((attendee) => ({ ...attendee })),
  };
}

function jsonRequest(init: RequestInit, token: string): RequestInit {
  return {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  };
}

export function createCrmLiveConnector(options: CrmLiveConnectorOptions): CrmLiveConnector {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const now = options.now ?? Date.now;
  const stateFactory = options.stateFactory ?? defaultStateFactory;
  const refreshSafetyWindowMs = options.refreshSafetyWindowMs ?? DEFAULT_REFRESH_SAFETY_WINDOW_MS;
  const pendingStates = new Map<CrmProvider, Set<string>>();

  function beginOAuth(provider: CrmProvider): { authorizationUrl: string; state: string } {
    const state = stateFactory();
    if (!state) throw new Error("OAuth state generation failed");
    const states = pendingStates.get(provider) ?? new Set<string>();
    states.add(state);
    pendingStates.set(provider, states);
    const url = new URL(provider === "salesforce" ? SALESFORCE_AUTHORIZE_URL : HUBSPOT_AUTHORIZE_URL);
    url.searchParams.set("client_id", options.clientIds[provider]);
    url.searchParams.set("redirect_uri", options.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes[provider]);
    url.searchParams.set("state", state);
    return { authorizationUrl: url.toString(), state };
  }

  async function completeOAuth(
    provider: CrmProvider,
    callback: { code: string; state: string },
  ): Promise<CrmCredential> {
    const states = pendingStates.get(provider);
    if (!callback.code || !callback.state || !states?.has(callback.state)) {
      throw new CrmAuthError("OAuth state is missing, mismatched, or already consumed");
    }
    states.delete(callback.state);
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: options.clientIds[provider],
      redirect_uri: options.redirectUri,
      code: callback.code,
    });
    const response = await fetchImpl(provider === "salesforce" ? SALESFORCE_TOKEN_URL : HUBSPOT_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    });
    const tokenBody = await responseBody(response);
    if (!response.ok) throw new CrmAuthError(responseMessage(tokenBody, response.status));
    const credential: CrmCredential = {
      accessToken: requiredString(tokenBody.access_token, "access_token"),
      refreshToken: typeof tokenBody.refresh_token === "string" ? tokenBody.refresh_token : "",
      expiresAt: now() + (typeof tokenBody.expires_in === "number" ? tokenBody.expires_in : 3600) * 1000,
    };
    if (provider === "salesforce" && typeof tokenBody.instance_url === "string") credential.instanceUrl = tokenBody.instance_url;
    await options.credentialStore.set(provider, credential);
    return credential;
  }

  async function refreshCredential(provider: CrmProvider, current: CrmCredential): Promise<CrmCredential> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: options.clientIds[provider],
      refresh_token: current.refreshToken,
    });
    const response = await fetchImpl(provider === "salesforce" ? SALESFORCE_TOKEN_URL : HUBSPOT_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    });
    const tokenBody = await responseBody(response);
    if (!response.ok) {
      await options.credentialStore.clear(provider);
      throw new CrmAuthError(`${providerName(provider)} authorization expired; reconnect required`);
    }
    const refreshed: CrmCredential = {
      accessToken: requiredString(tokenBody.access_token, "access_token"),
      refreshToken: typeof tokenBody.refresh_token === "string" && tokenBody.refresh_token
        ? tokenBody.refresh_token
        : current.refreshToken,
      expiresAt: now() + (typeof tokenBody.expires_in === "number" ? tokenBody.expires_in : 3600) * 1000,
      ...(provider === "salesforce"
        ? { instanceUrl: typeof tokenBody.instance_url === "string" ? tokenBody.instance_url : current.instanceUrl }
        : {}),
    };
    if (provider === "salesforce" && !refreshed.instanceUrl) {
      await options.credentialStore.clear(provider);
      throw new CrmAuthError("Salesforce authorization is missing its instance URL; reconnect required");
    }
    await options.credentialStore.set(provider, refreshed);
    return refreshed;
  }

  async function syncProvider(provider: CrmProvider, meeting: CrmSyncMeeting): Promise<CrmSyncResult> {
    let credential = await options.credentialStore.get(provider);
    if (!credential) throw new CrmAuthError(`${providerName(provider)} is not connected; reconnect required`);
    let hasRefreshed = false;
    if (credential.expiresAt <= now() + refreshSafetyWindowMs) {
      credential = await refreshCredential(provider, credential);
      hasRefreshed = true;
    }

    const request = async (url: string, init: RequestInit = {}): Promise<Record<string, unknown>> => {
      let response = await fetchImpl(url, jsonRequest(init, credential!.accessToken));
      if (response.status === 401 && !hasRefreshed) {
        credential = await refreshCredential(provider, credential!);
        hasRefreshed = true;
        response = await fetchImpl(url, jsonRequest(init, credential.accessToken));
      }
      const body = await responseBody(response);
      if (response.status === 401) {
        await options.credentialStore.clear(provider);
        throw new CrmAuthError(`${providerName(provider)} authorization expired; reconnect required`);
      }
      if (!response.ok) throw new CrmHttpError(responseMessage(body, response.status), response.status);
      return body;
    };

    const emails = uniqueAttendeeEmails(meeting);
    const matchedContacts = provider === "salesforce"
      ? await findSalesforceContacts(request, credential, emails)
      : await findHubSpotContacts(request, emails);
    if (provider === "salesforce") return syncSalesforce(request, credential, meeting, emails, matchedContacts);
    return syncHubSpot(request, meeting, emails, matchedContacts);
  }

  async function sync(
    provider: CrmProvider,
    meeting: CrmSyncMeeting,
    notifier?: CrmSyncNotifier,
  ): Promise<CrmSyncResult> {
    const snapshot = cloneMeeting(meeting);
    try {
      const result = await syncProvider(provider, snapshot);
      notifier?.success(`${provider} sync succeeded (${result.matchedAttendeeEmails.length} attendees matched)`);
      return result;
    } catch (error) {
      if (error instanceof CrmAuthError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      notifier?.failure(message, async () => {
        await sync(provider, snapshot, notifier);
      });
      throw error;
    }
  }

  return { beginOAuth, completeOAuth, sync };
}

type ContactMatch = { email: string; id: string };

async function findSalesforceContacts(
  request: (url: string, init?: RequestInit) => Promise<Record<string, unknown>>,
  credential: CrmCredential,
  emails: string[],
): Promise<ContactMatch[]> {
  if (!credential.instanceUrl) throw new CrmAuthError("Salesforce authorization is missing its instance URL; reconnect required");
  const matches: ContactMatch[] = [];
  for (const email of emails) {
    const query = `SELECT Id, Email FROM Contact WHERE Email = '${email.replaceAll("'", "\\'")}'`;
    const body = await request(`${credential.instanceUrl.replace(/\/$/, "")}/services/data/${SALESFORCE_API_VERSION}/query/?q=${encodeURIComponent(query)}`);
    const records = Array.isArray(body.records) ? body.records : [];
    const record = records.find((candidate): candidate is Record<string, unknown> => {
      if (!candidate || typeof candidate !== "object") return false;
      return normalizedEmail(String((candidate as Record<string, unknown>).Email ?? "")) === email;
    });
    if (record && typeof record.Id === "string") matches.push({ email, id: record.Id });
  }
  return matches;
}

async function findHubSpotContacts(
  request: (url: string, init?: RequestInit) => Promise<Record<string, unknown>>,
  emails: string[],
): Promise<ContactMatch[]> {
  const matches: ContactMatch[] = [];
  for (const email of emails) {
    const body = await request("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
        properties: ["email"],
        limit: 10,
      }),
    });
    const results = Array.isArray(body.results) ? body.results : [];
    const record = results.find((candidate): candidate is Record<string, unknown> => {
      if (!candidate || typeof candidate !== "object") return false;
      const properties = (candidate as Record<string, unknown>).properties;
      return Boolean(properties && typeof properties === "object" && normalizedEmail(String((properties as Record<string, unknown>).email ?? "")) === email);
    });
    if (record && typeof record.id === "string") matches.push({ email, id: record.id });
  }
  return matches;
}

async function syncSalesforce(
  request: (url: string, init?: RequestInit) => Promise<Record<string, unknown>>,
  credential: CrmCredential,
  meeting: CrmSyncMeeting,
  emails: string[],
  contacts: ContactMatch[],
): Promise<CrmSyncResult> {
  const baseUrl = credential.instanceUrl!.replace(/\/$/, "");
  const notes = meetingNotes(meeting);
  const opportunityId = meeting.salesforceOpportunityId;
  const opportunityBody = {
    Name: meeting.title,
    StageName: "Qualification",
    CloseDate: meeting.date.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? meeting.date,
    Description: notes,
  };
  const opportunity = await request(
    opportunityId
      ? `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/Opportunity/${opportunityId}`
      : `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/Opportunity`,
    { method: opportunityId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(opportunityBody) },
  );
  const resultingOpportunityId = opportunityId ?? requiredString(opportunity.id, "Salesforce opportunity id");
  const taskBody: Record<string, unknown> = {
    Subject: meeting.title,
    Status: "Not Started",
    Priority: "Normal",
    ActivityDate: meeting.date.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? meeting.date,
    Description: notes,
    WhatId: resultingOpportunityId,
  };
  if (contacts[0]) taskBody.WhoId = contacts[0].id;
  const task = await request(`${baseUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/Task`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(taskBody),
  });
  return {
    provider: "salesforce",
    opportunityOrDealId: resultingOpportunityId,
    activityId: requiredString(task.id, "Salesforce task id"),
    matchedAttendeeEmails: contacts.filter((contact) => emails.includes(contact.email)).map((contact) => contact.email),
  };
}

async function syncHubSpot(
  request: (url: string, init?: RequestInit) => Promise<Record<string, unknown>>,
  meeting: CrmSyncMeeting,
  emails: string[],
  contacts: ContactMatch[],
): Promise<CrmSyncResult> {
  const notes = meetingNotes(meeting);
  const dealId = meeting.hubspotDealId;
  const dealBody = { properties: { dealname: meeting.title, dealstage: "qualifiedtobuy", pipeline: "default", closedate: meeting.date, description: notes } };
  const deal = await request(
    dealId ? `https://api.hubapi.com/crm/v3/objects/deals/${dealId}` : "https://api.hubapi.com/crm/v3/objects/deals",
    { method: dealId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(dealBody) },
  );
  const resultingDealId = dealId ?? requiredString(deal.id, "HubSpot deal id");
  for (const contact of contacts) {
    await request(`https://api.hubapi.com/crm/v4/objects/deals/${resultingDealId}/associations/contacts/${contact.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }]),
    });
  }
  const note = await request("https://api.hubapi.com/crm/v3/objects/notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      properties: { hs_timestamp: meeting.date, hs_note_body: notes },
      associations: [
        { to: { id: resultingDealId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 214 }] },
        ...contacts.map((contact) => ({ to: { id: contact.id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] })),
      ],
    }),
  });
  return {
    provider: "hubspot",
    opportunityOrDealId: resultingDealId,
    activityId: requiredString(note.id, "HubSpot note id"),
    matchedAttendeeEmails: contacts.filter((contact) => emails.includes(contact.email)).map((contact) => contact.email),
  };
}
