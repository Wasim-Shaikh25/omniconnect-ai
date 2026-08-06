import { eventBus } from "@/shared/events";
import { getQueue } from "@/shared/queue";
import { generatePostIdeas, aiProvider } from "@/modules/ai/server";
import { metaService } from "@/modules/meta/server";
import { organizationQueries, organizationUsage } from "@/modules/workspaces";
import { makeGenerateContentIdeas } from "../application/generate-content-ideas";
import { makePublishMedia } from "../application/publish-media";
import { makeSchedulePost } from "../application/schedule-post";
import { makeReschedulePost } from "../application/reschedule-post";
import { makeHashtagIntelligence, type HashtagScorerInput } from "../application/hashtag-intelligence";
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

export const reschedulePost = makeReschedulePost({
  scheduledPostRepo: scheduledPostRepository,
  addJob: async (name, data, opts) => {
    const queue = await getQueue(CONTENT_SCHEDULE_QUEUE);
    return queue.add(name, data, opts);
  },
  removeJob: async (jobId) => {
    const queue = await getQueue(CONTENT_SCHEDULE_QUEUE);
    return queue.remove(jobId);
  },
});

const openRouterHashtagScorer: import("../application/hashtag-intelligence").HashtagScorer = async (
  input: HashtagScorerInput,
) => {
  const prompt = `You are a social-media hashtag strategist. Given the tag "${input.tag}" (searched as "${input.query}") with metrics: avgLikes=${input.metrics.avgLikes.toFixed(0)}, avgComments=${input.metrics.avgComments.toFixed(0)}, postCount=${input.metrics.postCount}, return a JSON object with these keys only: competitionLevel ("LOW" | "MEDIUM" | "HIGH"), reachEstimate (number), relevanceScore (number 0-100), recommendation (one sentence), evidence (one sentence).`;
  const json = await aiProvider.complete(
    [{ role: "system", content: prompt }],
    { model: "openai/gpt-4o-mini", operation: "hashtag-intelligence" },
  );
  const parsed = JSON.parse(json);
  return {
    competitionLevel: parsed.competitionLevel,
    reachEstimate: typeof parsed.reachEstimate === "number" ? parsed.reachEstimate : undefined,
    relevanceScore: typeof parsed.relevanceScore === "number" ? parsed.relevanceScore : undefined,
    recommendation: parsed.recommendation,
    evidence: parsed.evidence,
  };
};

export const hashtagIntelligence = makeHashtagIntelligence({
  searchHashtag: metaService.searchHashtag.bind(metaService),
  getHashtagMedia: metaService.getHashtagMedia.bind(metaService),
  scoreHashtags: openRouterHashtagScorer,
});

export const listScheduledPosts = (projectId: string) =>
  scheduledPostRepository.listByProject(projectId);
