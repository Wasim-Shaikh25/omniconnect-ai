/**
 * Conversations module — public barrel.
 *
 * The ONLY entry point other modules may import from `@/modules/conversations`.
 * Owns Conversation + Message persistence. Subscribes to `MetaMessageReceived`
 * to upsert the conversation and append the customer message.
 */
export const MODULE_NAME = "conversations" as const;

// Application record types
export type {
  ConversationRecord,
  MessageRecord,
  ConversationChannel,
  MessageSender,
} from "./application/ports";
export type { ConversationDetail } from "./application/queries";

// Queries (composed)
export { conversationQueries } from "./infrastructure/container";
