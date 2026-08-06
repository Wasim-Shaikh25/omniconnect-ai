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

// Presentation
export {
  generateContentIdeasAction,
  publishMediaAction,
} from "./presentation/actions";
export type {
  GenerateContentIdeasState,
  ContentActionState,
} from "./presentation/actions";
