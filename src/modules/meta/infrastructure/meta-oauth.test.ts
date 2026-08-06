import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

async function loadMetaOAuth() {
  vi.resetModules();
  const mod = await import("./meta-oauth");
  return mod;
}

describe("meta-oauth", () => {
  beforeEach(() => {
    process.env.META_APP_ID = "test-app-id";
    process.env.META_APP_SECRET = "test-app-secret";
    process.env.META_REDIRECT_URI = "http://localhost:3000/api/meta/callback";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    delete process.env.META_REDIRECT_URI;
  });

  describe("getMetaOAuthUrl", () => {
    it("throws when META_APP_ID is missing", async () => {
      delete process.env.META_APP_ID;
      const { getMetaOAuthUrl } = await loadMetaOAuth();
      expect(() => getMetaOAuthUrl("project-1")).toThrow("META_APP_ID");
    });

    it("returns a Facebook Login URL with projectId in state", async () => {
      const { getMetaOAuthUrl } = await loadMetaOAuth();
      const url = getMetaOAuthUrl("project-1");
      expect(url).toMatch(/^https:\/\/www\.facebook\.com\/v21\.0\/dialog\/oauth\?/);
      expect(url).toContain("client_id=test-app-id");
      expect(url).toContain("state=project-1");
      expect(url).toContain("response_type=code");
      expect(url).toContain("instagram_basic");
      expect(url).toContain("whatsapp_business_management");
    });
  });

  describe("exchangeMetaOAuthCode", () => {
    it("exchanges the code for a long-lived token", async () => {
      const { exchangeMetaOAuthCode } = await loadMetaOAuth();
      let calls = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          calls += 1;
          const isLongLived = url.includes("grant_type=fb_exchange_token");
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({ access_token: isLongLived ? "long-token" : "short-token" }),
            text: vi.fn().mockResolvedValue(""),
          });
        }),
      );

      const result = await exchangeMetaOAuthCode("auth-code");

      expect(calls).toBe(2);
      expect(result.accessToken).toBe("long-token");
    });

    it("throws on graph error", async () => {
      const { exchangeMetaOAuthCode } = await loadMetaOAuth();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: vi.fn().mockResolvedValue({}),
          text: vi.fn().mockResolvedValue("invalid code"),
        }),
      );

      await expect(exchangeMetaOAuthCode("bad-code")).rejects.toThrow("invalid code");
    });
  });

  describe("fetchInstagramAccount", () => {
    it("returns the Instagram Business account id when a page links one", async () => {
      const { fetchInstagramAccount } = await loadMetaOAuth();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
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
        }),
      );

      const account = await fetchInstagramAccount("user-token");

      expect(account).toEqual({
        accountId: "ig-123",
        pageId: "page-2",
        pageName: "Page Two",
        pageAccessToken: "page-token-2",
      });
    });

    it("falls back to the first page when no Instagram Business account is linked", async () => {
      const { fetchInstagramAccount } = await loadMetaOAuth();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({
            data: [{ id: "page-1", name: "Page One", access_token: "page-token-1" }],
          }),
          text: vi.fn().mockResolvedValue(""),
        }),
      );

      const account = await fetchInstagramAccount("user-token");

      expect(account).toEqual({
        accountId: "page-1",
        pageId: "page-1",
        pageName: "Page One",
        pageAccessToken: "page-token-1",
      });
    });

    it("returns null when the user has no pages", async () => {
      const { fetchInstagramAccount } = await loadMetaOAuth();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({ data: [] }),
          text: vi.fn().mockResolvedValue(""),
        }),
      );

      const account = await fetchInstagramAccount("user-token");
      expect(account).toBeNull();
    });
  });
});
