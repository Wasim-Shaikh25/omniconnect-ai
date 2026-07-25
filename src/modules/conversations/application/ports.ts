export type ConversationChannel = "INSTAGRAM" | "FACEBOOK";
export type MessageSender = "CUSTOMER" | "AI" | "HUMAN";

export interface ConversationRecord {
  id: string;
  storeId: string;
  channel: ConversationChannel;
  status: string;
  externalId: string | null;
  customerId: string | null;
  assignedHumanId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  createdAt: Date;
}

export interface ConversationRepository {
  /** Find or create the conversation keyed by store + channel + external id. */
  upsert(input: {
    storeId: string;
    channel: ConversationChannel;
    externalId: string | null;
  }): Promise<ConversationRecord>;

  listByStore(storeId: string, limit?: number): Promise<ConversationRecord[]>;

  findById(id: string): Promise<ConversationRecord | null>;

  updateStatus(
    id: string,
    status: "AI_ACTIVE" | "HUMAN_ACTIVE",
  ): Promise<ConversationRecord>;

  takeOver(input: {
    id: string;
    humanUserId: string;
  }): Promise<ConversationRecord>;

  resumeAI(id: string): Promise<ConversationRecord>;
}

export interface MessageRepository {
  append(input: {
    conversationId: string;
    sender: MessageSender;
    content: string;
  }): Promise<MessageRecord>;

  listByConversation(
    conversationId: string,
    limit?: number,
  ): Promise<MessageRecord[]>;

  countByConversation(conversationId: string): Promise<number>;
}
