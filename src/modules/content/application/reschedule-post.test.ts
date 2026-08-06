import { describe, it, expect, vi } from "vitest";
import { makeReschedulePost } from "./reschedule-post";
import type { ScheduledPostRecord, ScheduledPostRepository } from "./ports";

function makeRepo(initial: ScheduledPostRecord[]): { repo: ScheduledPostRepository; posts: ScheduledPostRecord[] } {
  const posts = [...initial];
  const repo: ScheduledPostRepository = {
    create: vi.fn(),
    findById: vi.fn(async (id) => posts.find((p) => p.id === id) ?? null),
    countByUserThisMonth: vi.fn(),
    update: vi.fn(async (id, data) => {
      const idx = posts.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      const updated = { ...posts[idx], ...data, updatedAt: new Date() } as ScheduledPostRecord;
      posts[idx] = updated;
      return updated;
    }),
    listByProject: vi.fn(),
  };
  return { repo, posts };
}

describe("makeReschedulePost", () => {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  const past = new Date(Date.now() - 60 * 60 * 1000);

  it("reschedules a SCHEDULED post, removes old job, adds new job", async () => {
    const post: ScheduledPostRecord = {
      id: "post-1",
      projectId: "p1",
      userId: "u1",
      caption: null,
      mediaType: "IMAGE",
      mediaUrls: ["https://example.com/x.jpg"],
      status: "SCHEDULED",
      scheduledAt: past,
      scheduledAtTimezone: "UTC",
      publishedAt: null,
      externalId: null,
      jobId: "job-1",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { repo } = makeRepo([post]);
    const addJob = vi.fn().mockResolvedValue("job-2");
    const removeJob = vi.fn().mockResolvedValue(undefined);

    const reschedule = makeReschedulePost({ scheduledPostRepo: repo, addJob, removeJob });
    const result = await reschedule({
      projectId: "p1",
      scheduledPostId: "post-1",
      scheduledAt: future,
      scheduledAtTimezone: "America/New_York",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("SCHEDULED");
      expect(result.value.scheduledAtTimezone).toBe("America/New_York");
      expect(result.value.jobId).toBe("job-2");
    }
    expect(removeJob).toHaveBeenCalledWith("job-1");
    expect(addJob).toHaveBeenCalledWith("publish-scheduled-post", { scheduledPostId: "post-1" }, { jobId: "post-1", delay: expect.any(Number) });
  });

  it("fails when post does not exist", async () => {
    const { repo } = makeRepo([]);
    const reschedule = makeReschedulePost({ scheduledPostRepo: repo, addJob: vi.fn(), removeJob: vi.fn() });
    const result = await reschedule({ projectId: "p1", scheduledPostId: "missing", scheduledAt: future });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("not found");
  });

  it("fails when post is not SCHEDULED", async () => {
    const post: ScheduledPostRecord = {
      id: "post-1",
      projectId: "p1",
      userId: "u1",
      caption: null,
      mediaType: "IMAGE",
      mediaUrls: [],
      status: "PUBLISHED",
      scheduledAt: past,
      scheduledAtTimezone: "UTC",
      publishedAt: new Date(),
      externalId: "x1",
      jobId: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { repo } = makeRepo([post]);
    const reschedule = makeReschedulePost({ scheduledPostRepo: repo, addJob: vi.fn(), removeJob: vi.fn() });
    const result = await reschedule({ projectId: "p1", scheduledPostId: "post-1", scheduledAt: future });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("Only scheduled posts");
  });

  it("fails when scheduled time is in the past", async () => {
    const post: ScheduledPostRecord = {
      id: "post-1",
      projectId: "p1",
      userId: "u1",
      caption: null,
      mediaType: "IMAGE",
      mediaUrls: [],
      status: "SCHEDULED",
      scheduledAt: future,
      scheduledAtTimezone: "UTC",
      publishedAt: null,
      externalId: null,
      jobId: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { repo } = makeRepo([post]);
    const reschedule = makeReschedulePost({ scheduledPostRepo: repo, addJob: vi.fn(), removeJob: vi.fn() });
    const result = await reschedule({ projectId: "p1", scheduledPostId: "post-1", scheduledAt: past });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("future");
  });

  it("marks post FAILED when re-enqueueing fails", async () => {
    const post: ScheduledPostRecord = {
      id: "post-1",
      projectId: "p1",
      userId: "u1",
      caption: null,
      mediaType: "IMAGE",
      mediaUrls: [],
      status: "SCHEDULED",
      scheduledAt: past,
      scheduledAtTimezone: "UTC",
      publishedAt: null,
      externalId: null,
      jobId: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { repo, posts } = makeRepo([post]);
    const reschedule = makeReschedulePost({
      scheduledPostRepo: repo,
      addJob: vi.fn().mockRejectedValue(new Error("queue down")),
      removeJob: vi.fn(),
    });
    const result = await reschedule({ projectId: "p1", scheduledPostId: "post-1", scheduledAt: future });

    expect(result.ok).toBe(false);
    expect(posts[0]?.status).toBe("FAILED");
    expect(posts[0]?.errorMessage).toContain("queue down");
  });
});
