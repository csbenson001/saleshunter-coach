import { describe, expect, it, vi } from "vitest";
import {
  createCrmLiveConnector,
  type CrmCredential,
  type CrmCredentialStore,
  type CrmProvider,
  type CrmSyncMeeting,
} from "./crmLiveSync";

const meeting: CrmSyncMeeting = {
  title: "Acme enterprise discovery",
  date: "2026-09-14T15:30:00.000Z",
  summary: ["Acme needs live coaching before Q4."],
  actionItems: ["Send the security review packet"],
  meddicStatus: {
    Metrics: true,
    "Economic Buyer": true,
    "Decision Criteria": true,
    "Decision Process": false,
    "Identify Pain": true,
    Champion: false,
  },
  objectionOutcomes: [{
    objection: "Budget",
    outcome: "Deferred to CFO",
    note: "The buyer asked for a finance review on Thursday.",
  }],
  agreedConcessions: ["Annual term in exchange for implementation support"],
  nextSteps: ["Confirm CFO review on Thursday"],
  attendees: [
    { name: "Alex Buyer", email: " Alex.Buyer@Acme.test " },
    { name: "Alex Duplicate", email: "alex.buyer@acme.test" },
    { name: "Unmatched Buyer", email: "nobody@acme.test" },
  ],
};

class MemoryCredentialStore implements CrmCredentialStore {
  private readonly values = new Map<CrmProvider, CrmCredential>();

  async get(provider: CrmProvider): Promise<CrmCredential | null> {
    return this.values.get(provider) ?? null;
  }

  async set(provider: CrmProvider, credential: CrmCredential): Promise<void> {
    this.values.set(provider, credential);
  }

  async clear(provider: CrmProvider): Promise<void> {
    this.values.delete(provider);
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function connector(fetchImpl: typeof fetch, store = new MemoryCredentialStore()) {
  return createCrmLiveConnector({
    credentialStore: store,
    clientIds: { salesforce: "sf-client", hubspot: "hs-client" },
    redirectUri: "http://127.0.0.1:43123/crm/callback",
    fetch: fetchImpl,
    now: () => 1_000_000,
    stateFactory: () => "state-for-test",
  });
}

describe("direct CRM live connector contract", () => {
  it.each([
    ["salesforce", "https://login.salesforce.com/services/oauth2/authorize"],
    ["hubspot", "https://app.hubspot.com/oauth/authorize"],
  ] as const)("starts and completes the %s OAuth handshake", async (provider, authorizeEndpoint) => {
    const requests: Request[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      return jsonResponse(provider === "salesforce"
        ? { access_token: "sf-access", refresh_token: "sf-refresh", instance_url: "https://acme.my.salesforce.com", expires_in: 3600 }
        : { access_token: "hs-access", refresh_token: "hs-refresh", expires_in: 1800 });
    });
    const api = connector(fetchMock);

    const authorization = api.beginOAuth(provider);
    const url = new URL(authorization.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(authorizeEndpoint);
    expect(url.searchParams.get("client_id")).toBe(provider === "salesforce" ? "sf-client" : "hs-client");
    expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:43123/crm/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("state-for-test");
    expect(url.searchParams.get("scope")).toBeTruthy();
    if (provider === "salesforce") expect(url.searchParams.get("scope")).toContain("refresh_token");
    if (provider === "hubspot") expect(url.searchParams.get("scope")).toContain("crm.objects");

    const credential = await api.completeOAuth(provider, { code: "one-time-code", state: authorization.state });
    expect(credential.accessToken).toMatch(/-access$/);
    expect(credential.refreshToken).toMatch(/-refresh$/);
    expect(credential.expiresAt).toBe(1_000_000 + (provider === "salesforce" ? 3600 : 1800) * 1000);
    if (provider === "salesforce") expect(credential.instanceUrl).toBe("https://acme.my.salesforce.com");
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(requests[0].headers.get("content-type")).toContain("application/x-www-form-urlencoded");
    expect(await requests[0].text()).toContain("code=one-time-code");
  });

  it("rejects a mismatched or replayed OAuth state before a token request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ access_token: "unused" }));
    const api = connector(fetchMock);
    api.beginOAuth("salesforce");

    await expect(api.completeOAuth("salesforce", { code: "code", state: "wrong-state" })).rejects.toThrow(/state/i);
    expect(fetchMock).not.toHaveBeenCalled();

    const authorization = api.beginOAuth("salesforce");
    await api.completeOAuth("salesforce", { code: "code", state: authorization.state });
    await expect(api.completeOAuth("salesforce", { code: "code", state: authorization.state })).rejects.toThrow(/state/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["salesforce", "hubspot"] as const)(
    "refreshes expired %s credentials and syncs structured meeting data with matched attendees",
    async (provider) => {
      const store = new MemoryCredentialStore();
      await store.set(provider, {
        accessToken: "expired-access",
        refreshToken: "refresh-me",
        expiresAt: 999_000,
        ...(provider === "salesforce" ? { instanceUrl: "https://acme.my.salesforce.com" } : {}),
      });
      const requests: Request[] = [];
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        requests.push(request);
        if (request.url.includes("/token")) {
          return jsonResponse(provider === "salesforce"
            ? { access_token: "fresh-access", refresh_token: "fresh-refresh", instance_url: "https://acme.my.salesforce.com", expires_in: 3600 }
            : { access_token: "fresh-access", refresh_token: "fresh-refresh", expires_in: 1800 });
        }
        if (request.url.includes("contacts/search") || request.url.includes("/query")) {
          return jsonResponse(provider === "salesforce"
            ? { records: [{ Id: "sf-contact-1", Email: "alex.buyer@acme.test" }] }
            : { results: [{ id: "hs-contact-1", properties: { email: "alex.buyer@acme.test" } }] });
        }
        if (provider === "salesforce") {
          return request.url.includes("/Task")
            ? jsonResponse({ id: "sf-task-1", success: true })
            : jsonResponse({ id: "sf-opportunity-1", success: true });
        }
        return request.url.includes("/notes")
          ? jsonResponse({ id: "hs-note-1" })
          : jsonResponse({ id: "hs-deal-1", properties: {} });
      });
      const api = createCrmLiveConnector({
        credentialStore: store,
        clientIds: { salesforce: "sf-client", hubspot: "hs-client" },
        redirectUri: "http://127.0.0.1:43123/crm/callback",
        fetch: fetchMock,
        now: () => 1_000_000,
        stateFactory: () => "unused-state",
      });

      const success = vi.fn();
      const result = await api.sync(provider, meeting, { success, failure: vi.fn() });
      expect(result).toMatchObject({
        provider,
        matchedAttendeeEmails: ["alex.buyer@acme.test"],
      });
      expect(result.opportunityOrDealId).toMatch(/^(sf-opportunity|hs-deal)-1$/);
      expect(result.activityId).toMatch(/^(sf-task|hs-note)-1$/);
      expect(success).toHaveBeenCalledWith(expect.stringContaining(provider));
      expect((await store.get(provider))?.accessToken).toBe("fresh-access");
      expect(requests[0].url).toContain("/token");

      const bodies = await Promise.all(requests.map(async (request) => request.clone().text()));
      const serialized = bodies.join("\n");
      expect(serialized).toContain("Acme needs live coaching before Q4.");
      expect(serialized).toContain("Deferred to CFO");
      expect(serialized).toContain("Annual term in exchange for implementation support");
      expect(serialized).toContain("Confirm CFO review on Thursday");
      expect(serialized).toContain("Metrics");
      expect(serialized).not.toContain("fresh-access");
      expect(serialized).not.toContain("refresh-me");
    },
  );

  it("refreshes once after a 401 and fails on a second 401 instead of looping", async () => {
    const store = new MemoryCredentialStore();
    await store.set("salesforce", {
      accessToken: "stale-access",
      refreshToken: "refresh-me",
      expiresAt: 2_000_000,
      instanceUrl: "https://acme.my.salesforce.com",
    });
    const requests: Request[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      if (request.url.includes("/token")) {
        return jsonResponse({
          access_token: "fresh-access",
          refresh_token: "fresh-refresh",
          instance_url: "https://acme.my.salesforce.com",
          expires_in: 3600,
        });
      }
      return jsonResponse({ message: "expired" }, 401);
    });
    const api = createCrmLiveConnector({
      credentialStore: store,
      clientIds: { salesforce: "sf-client", hubspot: "hs-client" },
      redirectUri: "http://127.0.0.1:43123/crm/callback",
      fetch: fetchMock,
      now: () => 1_000_000,
      stateFactory: () => "unused-state",
    });

    await expect(api.sync("salesforce", meeting)).rejects.toThrow(/401|unauthorized|reconnect/i);
    expect(requests.filter((request) => request.url.includes("/token"))).toHaveLength(1);
    expect(requests.filter((request) => !request.url.includes("/token"))).toHaveLength(2);
  });

  it("reports failure with a retry action that reuses the meeting snapshot", async () => {
    const store = new MemoryCredentialStore();
    await store.set("hubspot", {
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: 2_000_000,
    });
    let attempts = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      attempts += 1;
      if (attempts === 1) return jsonResponse({ message: "HubSpot temporarily unavailable" }, 503);
      if (String(input).includes("contacts/search")) {
        return jsonResponse({ results: [] });
      }
      if (String(input).includes("/deals")) return jsonResponse({ id: "hs-deal-retried" });
      return jsonResponse({ id: "hs-note-retried" });
    });
    const failure = vi.fn();
    const api = createCrmLiveConnector({
      credentialStore: store,
      clientIds: { salesforce: "sf-client", hubspot: "hs-client" },
      redirectUri: "http://127.0.0.1:43123/crm/callback",
      fetch: fetchMock,
      now: () => 1_000_000,
      stateFactory: () => "unused-state",
    });

    await expect(api.sync("hubspot", meeting, {
      success: vi.fn(),
      failure,
    })).rejects.toThrow(/temporarily unavailable/i);
    expect(failure).toHaveBeenCalledOnce();
    const retry = failure.mock.calls[0][1] as () => Promise<void>;
    await expect(retry()).resolves.toBeUndefined();
    expect(attempts).toBeGreaterThan(1);
    expect(failure.mock.calls[0][0]).toMatch(/HubSpot/i);
  });
});
