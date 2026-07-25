import type {
  ConversationRepository,
  MessageRecord,
  MessageRepository,
  MessageSender,
} from "./ports";

export function makeConversationCommands(deps: {
  conversations: ConversationRepository;
  messages: MessageRepository;
}) {
  return {
    async createConversation(input: {
      storeId: string;
      channel: "INSTAGRAM" | "FACEBOOK";
      externalId: string;
      customerId?: string;
    }) {
      return deps.conversations.upsert(input);
    },

    async appendMessage(
      conversationId: string,
      sender: MessageSender,
      content: string,
    ): Promise<MessageRecord> {
      return deps.messages.append({ conversationId, sender, content });
    },

    async setHumanActive(conversationId: string): Promise<void> {
      await deps.conversations.updateStatus(conversationId, "HUMAN_ACTIVE");
    },
  };
}

export type ConversationCommands = ReturnType<typeof makeConversationCommands>;
