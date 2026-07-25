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
export { NewMessage } from "./domain/events";
export type { NewMessagePayload } from "./domain/events";

// Application record types
export type {
  ConversationChannel,
  ConversationRecord,
  MessageRecord,
  MessageSender,
} from "./application/ports";
export type { ConversationCommands } from "./application/commands";
export type { ConversationDetail, ConversationQueries } from "./application/queries";

// Queries + commands (composed)
export {
  conversationCommands,
  conversationQueries,
} from "./infrastructure/container";
