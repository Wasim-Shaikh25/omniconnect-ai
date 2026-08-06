import { describe, it, expect, vi } from "vitest";
import { makePublishMedia } from "./publish-media";
import type { MetaService } from "@/modules/meta";

describe("makePublishMedia", () => {
  function makeSut() {
    const publishMedia = vi.fn<MetaService["publishMedia"]>().mockResolvedValue({
      externalId: "published-123",
    });
    return { publishMedia, publish: makePublishMedia({ publishMedia }) };
  }

  it("publishes an image post", async () => {
    const { publish, publishMedia } = makeSut();
    const result = await publish({
      projectId: "store-1",
      caption: "Hello world",
      mediaType: "IMAGE",
      mediaUrls: ["https://example.com/image.jpg"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.externalId).toBe("published-123");
    expect(publishMedia).toHaveBeenCalledWith("store-1", {
      caption: "Hello world",
      mediaType: "IMAGE",
      mediaUrls: ["https://example.com/image.jpg"],
    });
  });

  it("trims the caption before publishing", async () => {
    const { publish, publishMedia } = makeSut();
    await publish({
      projectId: "store-1",
      caption: "  Trim me  ",
      mediaType: "REEL",
      mediaUrls: ["https://example.com/video.mp4"],
    });

    expect(publishMedia).toHaveBeenCalledWith("store-1", {
      caption: "Trim me",
      mediaType: "REEL",
      mediaUrls: ["https://example.com/video.mp4"],
    });
  });

  it("returns an error when the provider returns null", async () => {
    const { publish, publishMedia } = makeSut();
    publishMedia.mockResolvedValue(null);

    const result = await publish({
      projectId: "store-1",
      mediaType: "STORY",
      mediaUrls: ["https://example.com/story.jpg"],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("Failed to publish");
  });

  it("rejects invalid media URLs", async () => {
    const { publish } = makeSut();
    await expect(
      publish({
        projectId: "store-1",
        mediaType: "IMAGE",
        mediaUrls: ["not-a-url"],
      }),
    ).rejects.toThrow();
  });

  it("rejects more than 10 media URLs", async () => {
    const { publish } = makeSut();
    await expect(
      publish({
        projectId: "store-1",
        mediaType: "CAROUSEL",
        mediaUrls: Array.from({ length: 11 }, (_, i) => `https://example.com/img${i}.jpg`),
      }),
    ).rejects.toThrow();
  });
});
