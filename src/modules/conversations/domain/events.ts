import { BaseDomainEvent } from "@/shared/kernel";
import type { ConversationChannel } from "../application/ports";

export interface NewMessagePayload {
  conversationId: string;
  storeId: string;
  channel: ConversationChannel;
  externalUserId: string;
  customerId: string | null;
  content: string;
}

/**
 * Emitted after a new customer message is appended to a conversation.
 * The AI assistant subscribes to generate a reply.
 */
export class NewMessage extends BaseDomainEvent<NewMessagePayload> {
  readonly name = "NewMessage";
}

export interface ConversationTakenOverPayload {
  conversationId: string;
  storeId: string;
  humanUserId: string;
  customerId: string | null;
}

export class ConversationTakenOver extends BaseDomainEvent<ConversationTakenOverPayload> {
  readonly name = "ConversationTakenOver";
}

export interface AIResumedPayload {
  conversationId: string;
  storeId: string;
  customerId: string | null;
}

export class AIResumed extends BaseDomainEvent<AIResumedPayload> {
  readonly name = "AIResumed";
}
