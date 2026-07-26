/**
 * Content module — public barrel.
 *
 * Owns content ideation domain events and the server action that surfaces
 * AI-generated content ideas to the Content Studio. The actual AI generation
 * is delegated to the `ai` module's public server barrel.
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

// Presentation
export { generateContentIdeasAction } from "./presentation/actions";
export type { GenerateContentIdeasState } from "./presentation/actions";
