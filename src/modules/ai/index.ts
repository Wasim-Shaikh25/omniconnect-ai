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
  AICompletionConfig,
  AIConfigurationRecord,
  AIConfigurationRepository,
  AIMessage,
  AIProvider,
  AssistantService,
  BrainConversationMemoryRecord,
  BrainMemoryRepository,
  TokenUsageRecord,
  TokenUsageRepository,
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
export type {
  MediaMetricsInput,
  MediaSlide,
  MediaAnalysis,
  AnalyzeMediaInput,
  AnalyzeMedia,
} from "./application/analyze-media";
export type {
  CreateContentIdeaInput,
  ContentIdeaOutput,
  CreateContentIdea,
} from "./application/create-content-idea";
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
export { resolveOperation } from "./application/operation-resolver";
export type { ResolveResult, ResolvedOperation, UnsupportedOperation, OperationExemplar } from "./application/operation-resolver";
export { queryAnalytics } from "./application/query-analytics";
export type { QueryAnalyticsResult, QueryAnalyticsDeps } from "./application/query-analytics";
export { generateDashboard } from "./application/generate-dashboard";
export type { GenerateDashboardResult, DashboardSchema, DashboardWidget, DashboardWidgetData, KPIData, ChartData, TableData, TableRow } from "./application/generate-dashboard";
