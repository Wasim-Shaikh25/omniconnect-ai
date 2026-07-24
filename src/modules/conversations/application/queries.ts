import type {
  ConversationRecord,
  ConversationRepository,
  MessageRecord,
  MessageRepository,
} from "./ports";

export interface ConversationDetail {
  conversation: ConversationRecord;
  messages: MessageRecord[];
}

export function makeConversationQueries(deps: {
  conversations: ConversationRepository;
  messages: MessageRepository;
}) {
  return {
    listConversations(
      storeId: string,
      limit = 50,
    ): Promise<ConversationRecord[]> {
      return deps.conversations.listByStore(storeId, limit);
    },

    async getConversation(id: string): Promise<ConversationDetail | null> {
      const conversation = await deps.conversations.findById(id);
      if (!conversation) return null;
      const messages = await deps.messages.listByConversation(id);
      return { conversation, messages };
    },
  };
}

export type ConversationQueries = ReturnType<typeof makeConversationQueries>;
