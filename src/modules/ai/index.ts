/**
 * Ai module — public barrel.
 *
 * Client-safe entry point: domain events, DTOs, action types, and server
 * actions. Wired application services are exported from `@/modules/ai/server`
 * for use by other server-side modules.
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
  BrainConversationMemoryRecord,
  BrainMemoryRepository,
} from "./application/ports";
export type { BrainMemoryService } from "./application/brain-memory";
export type { GenerateWelcome } from "./application/generate-welcome";
export type {
  GeneratedCaption,
  GenerateCaptionsInput,
  GenerateCaptions,
} from "./application/generate-captions";
export type {
  TrendIdea,
  GenerateTrendsInput,
  GenerateTrends,
} from "./application/generate-trends";
export type {
  GeneratePostIdeasInput,
  GeneratePostIdeas,
  GeneratePostIdeasResult,
} from "./application/generate-post-ideas";
export type {
  AnalyzeCompetitorInput,
  CompetitorAnalysis,
  AnalyzeCompetitor,
} from "./application/analyze-competitor";
export { updateAIConfigSchema } from "./application/update-config";
export type { UpdateAIConfigInput } from "./application/update-config";
export type {
  BusinessBrainAnswer,
  AskBusinessBrainInput,
} from "./application/ask-business-brain";
export { AIContextBuilder } from "./application/ai-context";
export type { AIContext } from "./application/ai-context";
export { selectModel } from "./application/model-router";
export type { AIOperation, ModelSelection } from "./application/model-router";
export { aiUsageGuard } from "./application/usage-guard";
export type { AIUsageGuard } from "./application/usage-guard";

// Presentation
export {
  updateAIConfigurationAction,
  generateCaptionsAction,
  generateTrendsAction,
  generatePostIdeasAction,
  askBusinessBrainAction,
} from "./presentation/actions";
export type { AIActionState, GenerateCaptionsState, GenerateTrendsState, GeneratePostIdeasState, AskBusinessBrainState } from "./presentation/actions";
