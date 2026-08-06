import { z } from "zod";
import { Result, ok, err } from "@/shared/kernel";
import type { ScheduledPostRepository, ScheduledPostRecord } from "./ports";

export const reschedulePostSchema = z.object({
  projectId: z.string().min(1),
  scheduledPostId: z.string().min(1),
  scheduledAt: z.date({ invalid_type_error: "Please choose a valid schedule date and time." }),
  scheduledAtTimezone: z.string().max(120).optional(),
});

export type ReschedulePostInput = z.infer<typeof reschedulePostSchema>;

export interface MakeReschedulePostDeps {
  scheduledPostRepo: ScheduledPostRepository;
  addJob(name: string, data: unknown, opts?: { jobId?: string; delay?: number }): Promise<string>;
  removeJob(jobId: string): Promise<void>;
}

export function makeReschedulePost(deps: MakeReschedulePostDeps) {
  return async function reschedulePost(
    raw: ReschedulePostInput,
  ): Promise<Result<ScheduledPostRecord, Error>> {
    const parsed = reschedulePostSchema.safeParse(raw);
    if (!parsed.success) {
      return err(new Error(parsed.error.issues[0]?.message ?? "Invalid input"));
    }
    const input = parsed.data;

    const post = await deps.scheduledPostRepo.findById(input.scheduledPostId);
    if (!post || post.projectId !== input.projectId) {
      return err(new Error("Scheduled post not found."));
    }
    if (post.status !== "SCHEDULED") {
      return err(new Error("Only scheduled posts can be rescheduled."));
    }

    const now = new Date();
    const delay = input.scheduledAt.getTime() - now.getTime();
    if (delay <= 0) {
      return err(new Error("Scheduled time must be in the future."));
    }

    if (post.jobId) {
      try {
        await deps.removeJob(post.jobId);
      } catch {
        // continue; we will overwrite the job id after re-enqueueing
      }
    }

    const timezone = input.scheduledAtTimezone ?? post.scheduledAtTimezone ?? "UTC";
    const updated = await deps.scheduledPostRepo.update(input.scheduledPostId, {
      scheduledAt: input.scheduledAt,
      scheduledAtTimezone: timezone,
      status: "SCHEDULED",
      publishedAt: undefined,
      externalId: undefined,
      errorMessage: null,
    });

    if (!updated) {
      return err(new Error("Failed to update the scheduled post."));
    }

    try {
      const jobId = await deps.addJob("publish-scheduled-post", { scheduledPostId: updated.id }, { jobId: updated.id, delay });
      await deps.scheduledPostRepo.update(updated.id, { jobId });
      return ok({ ...updated, jobId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      await deps.scheduledPostRepo.update(updated.id, {
        status: "FAILED",
        errorMessage: `Failed to re-enqueue the scheduled post: ${message}`,
      });
      return err(new Error("Failed to reschedule the post. The post has been marked as failed."));
    }
  };
}

export type ReschedulePost = ReturnType<typeof makeReschedulePost>;
