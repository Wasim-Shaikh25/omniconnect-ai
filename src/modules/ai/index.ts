/**
 * Ai module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/ai`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: Configurable, multi-model-ready AI customer assistant.
 */
export const MODULE_NAME = "ai" as const;

// Domain events
export { EscalationRequested, ReplyGenerated } from "./domain/events";
export type {
  EscalationRequestedPayload,
  ReplyGeneratedPayload,
} from "./domain/events";

// Application ports + record types
export type {
  AIConfigurationRecord,
  AIConfigurationRepository,
  AIMessage,
  AIProvider,
  AssistantService,
} from "./application/ports";
export type { GenerateWelcome } from "./application/generate-welcome";
export { updateAIConfigSchema } from "./application/update-config";
export type { UpdateAIConfigInput } from "./application/update-config";

// Composition root
export {
  aiQueries,
  generateReply,
  generateWelcome,
  updateAIConfiguration,
} from "./infrastructure/container";

// Presentation
export { updateAIConfigurationAction } from "./presentation/actions";
export type { AIActionState } from "./presentation/actions";
