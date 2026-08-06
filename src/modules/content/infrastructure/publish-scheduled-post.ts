import { logger } from "@/shared/observability";
import type { Job } from "@/shared/queue/types";
import { publishMedia, scheduledPostRepository } from "./container";

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
