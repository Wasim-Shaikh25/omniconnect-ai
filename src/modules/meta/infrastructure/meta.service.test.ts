import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GraphApiMetaService } from "./meta.service";
import type { MetaIntegrationRepository } from "../application/ports";
import type { RateLimitStore } from "@/shared/security/rate-limit";

class TestRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  async hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      return fresh;
    }
    bucket.count += 1;
    return bucket;
  }

  count(key: string): number {
    return this.buckets.get(key)?.count ?? 0;
  }
}

describe("GraphApiMetaService rate limiting", () => {
  const projectId = "project-1";
  let repo: MetaIntegrationRepository;
  let store: TestRateLimitStore;
  let service: GraphApiMetaService;

  beforeEach(() => {
    repo = {
      connect: vi.fn(),
      findByStore: vi.fn().mockResolvedValue({
        id: "int-1",
        projectId,
        channel: "INSTAGRAM",
        accountId: "account-1",
        pixelId: null,
        connectedAt: new Date(),
      }),
      findAccessToken: vi.fn().mockResolvedValue("token-1"),
    } as unknown as MetaIntegrationRepository;
    store = new TestRateLimitStore();
    service = new GraphApiMetaService(repo, store);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [{ id: "hashtag-1" }] }),
        text: vi.fn().mockResolvedValue(""),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows up to 200 Graph API calls per project per hour", async () => {
    for (let i = 0; i < 200; i++) {
      await service.searchHashtag(projectId, `query-${i}`);
    }
    expect(store.count(`meta:graph:${projectId}`)).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(200);
  });

  it("stops making Graph API calls once the 200 call/hour limit is exceeded", async () => {
    for (let i = 0; i < 200; i++) {
      await service.searchHashtag(projectId, `query-${i}`);
    }
    await service.searchHashtag(projectId, "overflow");
    expect(store.count(`meta:graph:${projectId}`)).toBe(201);
    expect(fetch).toHaveBeenCalledTimes(200);
  });

  it("keeps separate buckets for different projects", async () => {
    await service.searchHashtag("project-a", "q");
    await service.searchHashtag("project-b", "q");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(store.count("meta:graph:project-a")).toBe(1);
    expect(store.count("meta:graph:project-b")).toBe(1);
  });
});

describe("GraphApiMetaService.getAccountMedia pagination (REQ-0094)", () => {
  const projectId = "project-1";
  let repo: MetaIntegrationRepository;
  let service: GraphApiMetaService;

  beforeEach(() => {
    repo = {
      connect: vi.fn(),
      findByStore: vi.fn().mockResolvedValue({
        id: "int-1",
        projectId,
        channel: "INSTAGRAM",
        accountId: "account-1",
        pixelId: null,
        connectedAt: new Date(),
      }),
      findAccessToken: vi.fn().mockResolvedValue("token-1"),
    } as unknown as MetaIntegrationRepository;
    service = new GraphApiMetaService(repo, new TestRateLimitStore());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mediaRow(id: string) {
    return {
      id,
      media_type: "IMAGE",
      media_url: `https://example.com/${id}.jpg`,
      permalink: `https://instagram.com/p/${id}`,
      caption: `caption ${id}`,
      timestamp: "2026-01-01T00:00:00+0000",
      like_count: 1,
      comments_count: 1,
    };
  }

  it("follows the paging.next cursor to fetch beyond the first 25-item page", async () => {
    const page1 = { data: [mediaRow("a"), mediaRow("b")], paging: { next: "https://graph.facebook.com/v21.0/account-1/media?after=cursor-1" } };
    const page2 = { data: [mediaRow("c")], paging: {} };
    const insightsResponse = { data: [] };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/insights")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(insightsResponse), text: () => Promise.resolve("") });
      }
      if (url.includes("after=cursor-1")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(page2), text: () => Promise.resolve("") });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(page1), text: () => Promise.resolve("") });
    });
    vi.stubGlobal("fetch", fetchMock);

    const items = await service.getAccountMedia(projectId, 100);

    expect(items.map((i) => i.externalId)).toEqual(["a", "b", "c"]);
    const mediaListCalls = fetchMock.mock.calls.filter((call: unknown[]) => !(call[0] as string).includes("/insights"));
    expect(mediaListCalls).toHaveLength(2);
  });

  it("stops paginating once the requested limit is reached", async () => {
    const page1 = { data: [mediaRow("a"), mediaRow("b")], paging: { next: "https://graph.facebook.com/v21.0/account-1/media?after=cursor-1" } };
    const insightsResponse = { data: [] };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/insights")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(insightsResponse), text: () => Promise.resolve("") });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(page1), text: () => Promise.resolve("") });
    });
    vi.stubGlobal("fetch", fetchMock);

    const items = await service.getAccountMedia(projectId, 2);

    expect(items).toHaveLength(2);
    const mediaListCalls = fetchMock.mock.calls.filter((call: unknown[]) => !(call[0] as string).includes("/insights"));
    expect(mediaListCalls).toHaveLength(1);
  });
});
