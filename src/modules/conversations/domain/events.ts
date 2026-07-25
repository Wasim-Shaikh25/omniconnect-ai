import { BaseDomainEvent } from "@/shared/kernel";
import type { ConversationChannel } from "../application/ports";

export interface NewMessagePayload {
  conversationId: string;
  storeId: string;
  channel: ConversationChannel;
  externalUserId: string | null;
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
