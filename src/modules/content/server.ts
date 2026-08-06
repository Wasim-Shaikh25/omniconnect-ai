import { logger } from "@/shared/observability";
import { jobRegistry } from "@/shared/queue";
import { publishScheduledPost } from "./infrastructure/publish-scheduled-post";
import { listScheduledPosts } from "./infrastructure/container";

let registered = false;

/**
 * Register content-module background job handlers on the shared job registry.
 * Safe to call multiple times (idempotent).
 */
export function registerContentJobHandlers(): void {
  if (registered) return;
  registered = true;
  jobRegistry.register("publish-scheduled-post", publishScheduledPost);
  logger.info("content.jobs.registered");
}

export { listScheduledPosts };
