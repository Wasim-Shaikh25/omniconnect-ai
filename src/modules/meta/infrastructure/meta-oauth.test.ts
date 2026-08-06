import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

async function loadMetaOAuth() {
  vi.resetModules();
  const mod = await import("./meta-oauth");
  return mod;
}

function setupFetchStub(fetchStub: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchStub);
}

describe("meta-oauth", () => {
  beforeEach(() => {
    process.env.META_APP_ID = "test-app-id";
    process.env.META_APP_SECRET = "test-app-secret";
    process.env.META_REDIRECT_URI = "http://localhost:3000/api/meta/callback";
    process.env.NEXTAUTH_SECRET = "test-nextauth-secret-for-meta-oauth";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    delete process.env.META_REDIRECT_URI;
    delete process.env.NEXTAUTH_SECRET;
  });

  describe("getMetaOAuthUrl", () => {
    it("throws when META_APP_ID is missing", async () => {
      delete process.env.META_APP_ID;
      const { getMetaOAuthUrl, generateMetaOAuthNonce, createMetaOAuthState } = await loadMetaOAuth();
      const state = createMetaOAuthState("project-1", generateMetaOAuthNonce());
      expect(() => getMetaOAuthUrl("project-1", state)).toThrow("META_APP_ID");
    });

    it("returns a Facebook Login URL with the signed state", async () => {
      const { getMetaOAuthUrl, generateMetaOAuthNonce, createMetaOAuthState } = await loadMetaOAuth();
      const nonce = generateMetaOAuthNonce();
      const state = createMetaOAuthState("project-1", nonce);
      const url = getMetaOAuthUrl("project-1", state);
      expect(url).toMatch(/^https:\/\/www\.facebook\.com\/v21\.0\/dialog\/oauth\?/);
      expect(url).toContain("client_id=test-app-id");
      expect(url).toContain(`state=${encodeURIComponent(state)}`);
      expect(url).toContain("response_type=code");
      expect(url).toContain("instagram_basic");
      expect(url).toContain("whatsapp_business_management");
    });
  });

  describe("createMetaOAuthState / verifyMetaOAuthState", () => {
    it("round-trips and verifies a signed project id", async () => {
      const { createMetaOAuthState, verifyMetaOAuthState, generateMetaOAuthNonce } = await loadMetaOAuth();
      const nonce = generateMetaOAuthNonce();
      const state = createMetaOAuthState("project-1", nonce);
      expect(verifyMetaOAuthState(state, nonce)).toBe("project-1");
    });

    it("returns null for a tampered state", async () => {
      const { createMetaOAuthState, verifyMetaOAuthState, generateMetaOAuthNonce } = await loadMetaOAuth();
      const nonce = generateMetaOAuthNonce();
      const state = createMetaOAuthState("project-1", nonce);
      expect(verifyMetaOAuthState(state, generateMetaOAuthNonce())).toBeNull();
    });
  });

  describe("exchangeMetaOAuthCode", () => {
    it("exchanges the code for a long-lived token", async () => {
      const { exchangeMetaOAuthCode } = await loadMetaOAuth();
      const fetchStub = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        const body = init?.body instanceof URLSearchParams
          ? init.body.toString()
          : (typeof init?.body === "string" ? init.body : "");
        const isLongLived = body.includes("grant_type=fb_exchange_token");
        return Promise.resolve({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: isLongLived ? "long-token" : "short-token" }),
          text: vi.fn().mockResolvedValue(""),
        });
      });
      setupFetchStub(fetchStub);

      const result = await exchangeMetaOAuthCode("auth-code");

      expect(fetchStub).toHaveBeenCalledTimes(2);
      const [, firstInit] = fetchStub.mock.calls[0] as [string, RequestInit];
      const [, secondInit] = fetchStub.mock.calls[1] as [string, RequestInit];
      expect(firstInit?.body).toBeInstanceOf(URLSearchParams);
      expect(secondInit?.body).toBeInstanceOf(URLSearchParams);
      expect(result.accessToken).toBe("long-token");
    });

    it("throws on graph error", async () => {
      const { exchangeMetaOAuthCode } = await loadMetaOAuth();
      const fetchStub = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
        text: vi.fn().mockResolvedValue("invalid code"),
      });
      setupFetchStub(fetchStub);

      await expect(exchangeMetaOAuthCode("bad-code")).rejects.toThrow("Meta OAuth graph error");
    });
  });

  describe("fetchInstagramAccount", () => {
    it("returns the Instagram Business account id when a page links one", async () => {
      const { fetchInstagramAccount } = await loadMetaOAuth();
      const fetchStub = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [
            {
              id: "page-1",
              name: "Page One",
              access_token: "page-token-1",
            },
            {
              id: "page-2",
              name: "Page Two",
              access_token: "page-token-2",
              instagram_business_account: { id: "ig-123" },
            },
          ],
        }),
        text: vi.fn().mockResolvedValue(""),
      });
      setupFetchStub(fetchStub);

      const account = await fetchInstagramAccount("user-token");

      expect(account).toEqual({
        accountId: "ig-123",
        pageId: "page-2",
        pageName: "Page Two",
        pageAccessToken: "page-token-2",
      });
      const [, init] = fetchStub.mock.calls[0] as [string, RequestInit];
      expect(init?.headers).toMatchObject({ authorization: "Bearer user-token" });
    });

    it("returns null when no page has an Instagram Business account", async () => {
      const { fetchInstagramAccount } = await loadMetaOAuth();
      const fetchStub = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [{ id: "page-1", name: "Page One", access_token: "page-token-1" }],
        }),
        text: vi.fn().mockResolvedValue(""),
      });
      setupFetchStub(fetchStub);

      const account = await fetchInstagramAccount("user-token");

      expect(account).toBeNull();
    });

    it("returns null when the user has no pages", async () => {
      const { fetchInstagramAccount } = await loadMetaOAuth();
      const fetchStub = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
        text: vi.fn().mockResolvedValue(""),
      });
      setupFetchStub(fetchStub);

      const account = await fetchInstagramAccount("user-token");
      expect(account).toBeNull();
    });
  });
});
