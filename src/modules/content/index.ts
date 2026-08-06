/**
 * Content module — public barrel.
 *
 * Owns content ideation, publishing, and scheduling orchestration. AI ideation
 * is delegated to the `ai` module; Meta Graph API calls are delegated to the
 * `meta` module through its public `MetaService` port.
 */
export const MODULE_NAME = "content" as const;

// Domain events
export { ContentIdeasGenerated } from "./domain/events";
export type { ContentIdeasGeneratedPayload } from "./domain/events";

// Application record types
export type {
  GenerateContentIdeasInput,
  GenerateContentIdeasResult,
  GenerateContentIdeas,
} from "./application/generate-content-ideas";
export type { PublishMedia, PublishMediaInput } from "./application/publish-media";
export type { SchedulePost, SchedulePostInput } from "./application/schedule-post";
export type { ReschedulePost, ReschedulePostInput } from "./application/reschedule-post";
export type {
  HashtagIntelligence,
  HashtagIntelligenceInput,
  HashtagAnalysis,
  HashtagScorer,
  HashtagScorerInput,
} from "./application/hashtag-intelligence";
export type {
  ScheduledPostRecord,
  ScheduledPostRepository,
  ScheduledPostStatus,
} from "./application/ports";

// Presentation
export {
  generateContentIdeasAction,
  publishMediaAction,
  schedulePostAction,
  reschedulePostAction,
  hashtagIntelligenceAction,
} from "./presentation/actions";
export type {
  GenerateContentIdeasState,
  ContentActionState,
  HashtagIntelligenceState,
} from "./presentation/actions";

export { CONTENT_SCHEDULE_QUEUE } from "./infrastructure/queue";
