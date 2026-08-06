import { eventBus } from "@/shared/events";
import { getQueue } from "@/shared/queue";
import { generatePostIdeas } from "@/modules/ai/server";
import { metaService } from "@/modules/meta/server";
import { organizationQueries, organizationUsage } from "@/modules/workspaces";
import { makeGenerateContentIdeas } from "../application/generate-content-ideas";
import { makePublishMedia } from "../application/publish-media";
import { makeSchedulePost } from "../application/schedule-post";
import { scheduledPostRepository } from "./scheduled-post.repository";
import { CONTENT_SCHEDULE_QUEUE } from "./queue";

export { scheduledPostRepository };

export const generateContentIdeas = makeGenerateContentIdeas({
  generatePostIdeas,
  eventBus,
  getOrganizationIdByStoreId: organizationQueries.getOrganizationIdByStoreId,
});

export const publishMedia = makePublishMedia({
  publishMedia: metaService.publishMedia.bind(metaService),
});

export const schedulePost = makeSchedulePost({
  scheduledPostRepo: scheduledPostRepository,
  publishMedia: metaService.publishMedia.bind(metaService),
  checkScheduleLimit: (userId, currentUsage) =>
    organizationUsage.checkLimit(userId, currentUsage, "maxContentSchedulesPerMonth"),
  addJob: async (name, data, opts) => {
    const queue = await getQueue(CONTENT_SCHEDULE_QUEUE);
    return queue.add(name, data, opts);
  },
});

export const listScheduledPosts = (projectId: string) =>
  scheduledPostRepository.listByProject(projectId);
