/**
 * Conversations module — public barrel.
 *
 * The ONLY entry point other modules may import from `@/modules/conversations`.
 * Owns Conversation + Message persistence. Subscribes to `MetaMessageReceived`
 * to upsert the conversation, append the customer message, and publish
 * `NewMessage` for the AI assistant.
 */
export const MODULE_NAME = "conversations" as const;

// Domain events
export { NewMessage, ConversationTakenOver, AIResumed, ConversationInsightGenerated, ConversationRecommendationGenerated } from "./domain/events";
export type {
  NewMessagePayload,
  ConversationTakenOverPayload,
  AIResumedPayload,
  ConversationInsight,
  ConversationRecommendation,
  ConversationInsightGeneratedPayload,
  ConversationRecommendationGeneratedPayload,
} from "./domain/events";

// Application record types
export type {
  ConversationChannel,
  ConversationRecord,
  MessageRecord,
  MessageSender,
} from "./application/ports";
export type { ConversationCommands } from "./application/commands";
export type { ConversationDetail, ConversationQueries } from "./application/queries";
export type { DetectConversationInsights } from "./application/detect-insights";
export type {
  InboxItem,
  UnifiedInboxFilter,
  GetUnifiedInbox,
} from "./application/unified-inbox";
export type { ActionResult } from "./application/action-handlers";
export { executeConversationAction } from "./application/action-handlers";

// Queries + commands (composed)
export {
  conversationCommands,
  conversationQueries,
  unifiedInboxQueries,
  detectConversationInsights,
} from "./infrastructure/container";

// Presentation
export {
  takeOverConversationAction,
  resumeAIConversationAction,
  getUnifiedInboxAction,
} from "./presentation/actions";
export type { ConversationActionState } from "./presentation/actions";
