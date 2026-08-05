import { describe, it, expect, vi } from "vitest";
import { makeMetaProfileFetcher, NoMetaAccessError, ProfileNotFoundError, MetaApiError } from "./meta-profile-fetcher";

describe("makeMetaProfileFetcher", () => {
  it("throws NoMetaAccessError when no token is available", async () => {
    const fetcher = makeMetaProfileFetcher({ getAccessToken: vi.fn().mockResolvedValue(null) });
    await expect(fetcher.fetch("testuser", "project-1")).rejects.toBeInstanceOf(NoMetaAccessError);
  });

  it("returns a PublicProfile when Meta responds successfully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        business_discovery: {
          followers_count: 5000,
          media_count: 10,
          biography: "Travel blogger",
          media: {
            data: [
              {
                id: "media-1",
                media_type: "IMAGE",
                caption: "Hello #travel",
                timestamp: "2026-01-01T10:00:00+0000",
                like_count: 100,
                comments_count: 5,
                permalink: "https://instagram.com/p/media-1",
              },
            ],
          },
        },
      }),
    });

    const commentsFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ text: "Nice photo" }],
      }),
    });

    const combinedFetch = vi.fn((url: string) => {
      if (url.includes("/comments")) {
        return commentsFetch();
      }
      return mockFetch();
    });

    const fetcher = makeMetaProfileFetcher({
      baseUrl: "https://graph.test",
      apiVersion: "v1",
      getAccessToken: vi.fn().mockResolvedValue("token-123"),
      fetch: combinedFetch as typeof fetch,
    });

    const profile = await fetcher.fetch("testuser", "project-1");
    expect(profile).not.toBeNull();
    expect(profile!.username).toBe("testuser");
    expect(profile!.followerCount).toBe(5000);
    expect(profile!.media.length).toBe(1);
    expect(profile!.media[0]?.hashtags).toContain("#travel");
    expect(profile!.comments.length).toBe(1);
    expect(profile!.comments[0]?.text).toBe("Nice photo");
  });

  it("throws ProfileNotFoundError on a 404", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: "not found", code: 803 } }),
    });

    const fetcher = makeMetaProfileFetcher({
      getAccessToken: vi.fn().mockResolvedValue("token-123"),
      fetch: mockFetch as typeof fetch,
    });

    await expect(fetcher.fetch("missing", "project-1")).rejects.toBeInstanceOf(ProfileNotFoundError);
  });

  it("throws MetaApiError on other API errors", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "Internal server error" } }),
    });

    const fetcher = makeMetaProfileFetcher({
      getAccessToken: vi.fn().mockResolvedValue("token-123"),
      fetch: mockFetch as typeof fetch,
    });

    await expect(fetcher.fetch("testuser", "project-1")).rejects.toBeInstanceOf(MetaApiError);
  });
});
