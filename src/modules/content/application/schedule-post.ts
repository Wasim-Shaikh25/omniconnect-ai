import { z } from "zod";
import type { MetaService } from "@/modules/meta";
import { Result, ok, err } from "@/shared/kernel";
import type { JobOptions } from "@/shared/queue/types";
import type { ScheduledPostRecord, ScheduledPostRepository } from "./ports";

export const schedulePostSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  caption: z.string().max(2200).optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "REEL", "CAROUSEL", "STORY"] as const),
  mediaUrls: z.array(z.string().url()).min(1).max(10),
  scheduledAt: z.date({ invalid_type_error: "Please choose a valid schedule date and time." }),
  scheduledAtTimezone: z.string().max(120).optional(),
});

export type SchedulePostInput = z.infer<typeof schedulePostSchema>;

function formatValidationIssues(issues: z.ZodIssue[]): string {
  const first = issues[0];
  if (!first) return "Invalid input.";
  const topLevelPath = first.path[0];
  if (topLevelPath === "mediaUrls") {
    if (first.code === "too_big") return "You can only schedule up to 10 media URLs at once.";
    if (first.code === "too_small") return "At least one media URL is required.";
    if (first.code === "invalid_string" && first.validation === "url") {
      return "Every media URL must be a valid, publicly reachable URL.";
    }
  }
  if (topLevelPath === "scheduledAt") {
    return "Please choose a valid schedule date and time.";
  }
  return `${first.path.join(".") || "Input"}: ${first.message}`;
}

export function makeSchedulePost(deps: {
  scheduledPostRepo: ScheduledPostRepository;
  publishMedia: MetaService["publishMedia"];
  checkScheduleLimit: (
    userId: string,
    currentUsage: number,
  ) => Promise<{ allowed: boolean; limit: number | null }>;
  addJob: (
    name: string,
    data: { scheduledPostId: string },
    opts?: JobOptions,
  ) => Promise<string>;
}) {
  return async function schedulePost(
    raw: SchedulePostInput,
  ): Promise<Result<ScheduledPostRecord, Error>> {
    const parsed = schedulePostSchema.safeParse(raw);
    if (!parsed.success) {
      return err(new Error(formatValidationIssues(parsed.error.issues)));
    }
    const input = parsed.data;

    const now = new Date();
    const count = await deps.scheduledPostRepo.countByUserThisMonth(input.userId, now);
    const { allowed, limit } = await deps.checkScheduleLimit(input.userId, count);
    if (!allowed) {
      return err(
        new Error(
          limit !== null
            ? `You have reached your plan limit of ${limit} scheduled posts this month.`
            : "Scheduled post limit reached for your plan.",
        ),
      );
    }

    const post = await deps.scheduledPostRepo.create({
      projectId: input.projectId,
      userId: input.userId,
      caption: input.caption?.trim() || null,
      mediaType: input.mediaType,
      mediaUrls: input.mediaUrls,
      status: "SCHEDULED",
      scheduledAt: input.scheduledAt,
      scheduledAtTimezone: input.scheduledAtTimezone ?? null,
    });

    const delay = post.scheduledAt.getTime() - now.getTime();
    if (delay > 0) {
      try {
        const jobId = await deps.addJob(
          "publish-scheduled-post",
          { scheduledPostId: post.id },
          { jobId: post.id, delay },
        );
        await deps.scheduledPostRepo.update(post.id, { jobId });
        return ok({ ...post, jobId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown";
        await deps.scheduledPostRepo.update(post.id, {
          status: "FAILED",
          errorMessage: `Failed to enqueue the scheduled post: ${message}`,
        });
        return err(new Error("Failed to schedule the post. The post has been marked as failed."));
      }
    }

    const result = await deps.publishMedia(input.projectId, {
      caption: input.caption?.trim() || undefined,
      mediaType: input.mediaType,
      mediaUrls: input.mediaUrls,
    });

    if (!result) {
      await deps.scheduledPostRepo.update(post.id, {
        status: "FAILED",
        errorMessage: "Failed to publish the post immediately.",
      });
      return err(
        new Error(
          "The post was scheduled for the past or too close to now, and the immediate publish failed. The post is saved with status FAILED.",
        ),
      );
    }

    const updated = await deps.scheduledPostRepo.update(post.id, {
      status: "PUBLISHED",
      externalId: result.externalId,
      publishedAt: new Date(),
    });

    return ok(updated ?? post);
  };
}

export type SchedulePost = ReturnType<typeof makeSchedulePost>;
