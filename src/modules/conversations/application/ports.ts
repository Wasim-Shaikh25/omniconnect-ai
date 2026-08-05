export type ConversationChannel = "INSTAGRAM" | "FACEBOOK";
export type MessageSender = "CUSTOMER" | "AI" | "HUMAN";

export interface ConversationRecord {
  id: string;
  projectId: string;
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
  inReplyToMessageId: string | null;
  sender: MessageSender;
  content: string;
  createdAt: Date;
}

export interface ConversationRepository {
  /** Find or create the conversation keyed by store + channel + external id. */
  upsert(input: {
    projectId: string;
    channel: ConversationChannel;
    externalId: string | null;
  }): Promise<ConversationRecord>;

  listByStore(
    projectId: string,
    options?: { limit?: number; offset?: number; search?: string },
  ): Promise<ConversationRecord[]>;

  countByStore(projectId: string, options?: { search?: string }): Promise<number>;

  listByStoreIds(storeIds: string[], limit?: number): Promise<ConversationRecord[]>;

  findById(id: string, projectId?: string): Promise<ConversationRecord | null>;

  updateStatus(
    id: string,
    projectId: string,
    status: "AI_ACTIVE" | "HUMAN_ACTIVE",
  ): Promise<ConversationRecord>;

  takeOver(input: {
    id: string;
    projectId: string;
    humanUserId: string;
  }): Promise<ConversationRecord>;

  resumeAI(id: string, projectId: string): Promise<ConversationRecord>;
}

export interface MessageRepository {
  append(input: {
    conversationId: string;
    projectId: string;
    sender: MessageSender;
    content: string;
    inReplyToMessageId?: string | null;
  }): Promise<MessageRecord>;

  findByInReplyToMessageId(
    inReplyToMessageId: string,
  ): Promise<MessageRecord | null>;

  listByConversation(
    conversationId: string,
    limit?: number,
  ): Promise<MessageRecord[]>;

  listLatestByConversationIds(
    conversationIds: string[],
  ): Promise<Record<string, MessageRecord>>;

  countByConversation(conversationId: string): Promise<number>;
}
