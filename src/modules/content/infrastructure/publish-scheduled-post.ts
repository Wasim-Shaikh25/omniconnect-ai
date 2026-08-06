import { logger } from "@/shared/observability";
import { getQueue } from "@/shared/queue";
import type { Job } from "@/shared/queue/types";
import { publishMedia, scheduledPostRepository } from "./container";
import { CONTENT_SCHEDULE_QUEUE } from "./queue";

const REQUEUE_THRESHOLD_MS = 5_000;

export async function publishScheduledPost(
  job: Job<{ scheduledPostId: string }>,
): Promise<void> {
  const { scheduledPostId } = job.data;

  const post = await scheduledPostRepository.findById(scheduledPostId);
  if (!post || post.status !== "SCHEDULED") {
    logger.info("content.publishScheduledPost.skipped", {
      scheduledPostId,
      status: post?.status ?? "missing",
    });
    return;
  }

  const now = Date.now();
  const due = post.scheduledAt.getTime();
  if (due > now) {
    const remainingMs = due - now;
    if (remainingMs > REQUEUE_THRESHOLD_MS) {
      logger.info("content.publishScheduledPost.tooEarly", {
        scheduledPostId,
        due,
        now,
        remainingMs,
      });
      const queue = await getQueue(CONTENT_SCHEDULE_QUEUE);
      try {
        await queue.remove(scheduledPostId);
      } catch {
        // ignore — the job may not exist in the queue anymore
      }
      try {
        await queue.add(
          "publish-scheduled-post",
          { scheduledPostId },
          { jobId: scheduledPostId, delay: remainingMs },
        );
        logger.info("content.publishScheduledPost.requeued", {
          scheduledPostId,
          remainingMs,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown";
        logger.error("content.publishScheduledPost.requeueFailed", {
          scheduledPostId,
          error: message,
        });
        throw new Error(`Scheduled post invoked too early and could not be re-enqueued: ${message}`);
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, remainingMs));
  }

  try {
    const result = await publishMedia({
      projectId: post.projectId,
      caption: post.caption ?? undefined,
      mediaType: post.mediaType,
      mediaUrls: post.mediaUrls,
    });

    if (!result.ok) {
      await scheduledPostRepository.update(scheduledPostId, {
        status: "FAILED",
        errorMessage: result.error.message,
      });
      logger.warn("content.publishScheduledPost.failed", {
        scheduledPostId,
        error: result.error.message,
      });
      return;
    }

    await scheduledPostRepository.update(scheduledPostId, {
      status: "PUBLISHED",
      externalId: result.value.externalId,
      publishedAt: new Date(),
    });
    logger.info("content.publishScheduledPost.ok", {
      scheduledPostId,
      externalId: result.value.externalId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    await scheduledPostRepository.update(scheduledPostId, {
      status: "FAILED",
      errorMessage: message,
    });
    logger.error("content.publishScheduledPost.error", { scheduledPostId, error: message });
  }
}
