import { eventBus } from "@/shared/events";
import type {
  ConversationRepository,
  MessageRecord,
  MessageRepository,
  MessageSender,
} from "./ports";
import { AIResumed, ConversationTakenOver } from "../domain/events";

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

    async takeOver(input: {
      conversationId: string;
      humanUserId: string;
    }): Promise<void> {
      const conversation = await deps.conversations.takeOver({
        id: input.conversationId,
        humanUserId: input.humanUserId,
      });

      await deps.messages.append({
        conversationId: input.conversationId,
        sender: "HUMAN",
        content: "Agent took over the conversation.",
      });

      await eventBus.publish(
        new ConversationTakenOver(conversation.id, {
          conversationId: conversation.id,
          storeId: conversation.storeId,
          humanUserId: input.humanUserId,
        }),
      );
    },

    async resumeAI(conversationId: string): Promise<void> {
      const conversation = await deps.conversations.resumeAI(conversationId);

      await deps.messages.append({
        conversationId,
        sender: "HUMAN",
        content: "AI resumed.",
      });

      await eventBus.publish(
        new AIResumed(conversation.id, {
          conversationId: conversation.id,
          storeId: conversation.storeId,
        }),
      );
    },
  };
}

export type ConversationCommands = ReturnType<typeof makeConversationCommands>;
