import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeSchedulePost } from "./schedule-post";
import type { ScheduledPostRecord, ScheduledPostRepository } from "./ports";
import type { MetaService } from "@/modules/meta";

const now = new Date("2026-08-06T12:00:00Z");

function makeSut() {
  const posts: ScheduledPostRecord[] = [];

  const scheduledPostRepo: ScheduledPostRepository = {
    create: vi.fn(async (input) => {
      const post: ScheduledPostRecord = {
        id: `post-${posts.length + 1}`,
        ...input,
        status: input.status ?? "SCHEDULED",
        caption: input.caption ?? null,
        publishedAt: null,
        externalId: null,
        jobId: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      };
      posts.push(post);
      return post;
    }),
    findById: vi.fn(async (id) => posts.find((p) => p.id === id) ?? null),
    countByUserThisMonth: vi.fn(async () => posts.length),
    update: vi.fn(async (id, data) => {
      const post = posts.find((p) => p.id === id);
      if (!post) return null;
      Object.assign(post, data);
      return post;
    }),
    listByProject: vi.fn(async () => posts),
  };

  const publishMedia = vi.fn<MetaService["publishMedia"]>().mockResolvedValue({
    externalId: "published-123",
  });

  const checkScheduleLimit = vi.fn().mockResolvedValue({ allowed: true, limit: 5 });

  const addJob = vi.fn().mockResolvedValue("job-1");

  const schedulePost = makeSchedulePost({
    scheduledPostRepo,
    publishMedia,
    checkScheduleLimit,
    addJob,
  });

  return { schedulePost, scheduledPostRepo, publishMedia, checkScheduleLimit, addJob, posts };
}

describe("makeSchedulePost", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules a future post and enqueues a delayed job", async () => {
    const { schedulePost, scheduledPostRepo, addJob } = makeSut();
    const scheduledAt = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour

    const result = await schedulePost({
      projectId: "store-1",
      userId: "user-1",
      caption: "Hello",
      mediaType: "IMAGE",
      mediaUrls: ["https://example.com/image.jpg"],
      scheduledAt,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("SCHEDULED");
    expect(result.value.scheduledAt).toEqual(scheduledAt);
    expect(scheduledPostRepo.create).toHaveBeenCalled();
    expect(addJob).toHaveBeenCalledWith(
      "publish-scheduled-post",
      { scheduledPostId: result.value.id },
      expect.objectContaining({ delay: expect.any(Number) }),
    );
  });

  it("publishes immediately when scheduledAt is in the past and marks the post published", async () => {
    const { schedulePost, publishMedia, scheduledPostRepo } = makeSut();

    const result = await schedulePost({
      projectId: "store-1",
      userId: "user-1",
      caption: "Hello",
      mediaType: "IMAGE",
      mediaUrls: ["https://example.com/image.jpg"],
      scheduledAt: new Date(now.getTime() - 1000),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("PUBLISHED");
    expect(result.value.externalId).toBe("published-123");
    expect(publishMedia).toHaveBeenCalledWith("store-1", {
      caption: "Hello",
      mediaType: "IMAGE",
      mediaUrls: ["https://example.com/image.jpg"],
    });
    expect(scheduledPostRepo.update).toHaveBeenCalledWith(
      result.value.id,
      expect.objectContaining({ status: "PUBLISHED", externalId: "published-123" }),
    );
  });

  it("returns a friendly error when media URLs exceed the limit", async () => {
    const { schedulePost } = makeSut();

    const result = await schedulePost({
      projectId: "store-1",
      userId: "user-1",
      mediaType: "CAROUSEL",
      mediaUrls: Array.from({ length: 11 }, (_, i) => `https://example.com/img${i}.jpg`),
      scheduledAt: new Date(now.getTime() + 60 * 60 * 1000),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("up to 10");
  });

  it("returns an error when the plan limit is reached", async () => {
    const { schedulePost, checkScheduleLimit } = makeSut();
    checkScheduleLimit.mockResolvedValue({ allowed: false, limit: 5 });

    const result = await schedulePost({
      projectId: "store-1",
      userId: "user-1",
      mediaType: "IMAGE",
      mediaUrls: ["https://example.com/image.jpg"],
      scheduledAt: new Date(now.getTime() + 60 * 60 * 1000),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain("5");
  });
});
