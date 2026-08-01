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
      storeId: string,
      sender: MessageSender,
      content: string,
      inReplyToMessageId?: string | null,
    ): Promise<MessageRecord> {
      return deps.messages.append({
        conversationId,
        storeId,
        sender,
        content,
        inReplyToMessageId,
      });
    },

    async setHumanActive(conversationId: string, storeId: string): Promise<void> {
      await deps.conversations.updateStatus(conversationId, storeId, "HUMAN_ACTIVE");
    },

    async takeOver(input: {
      conversationId: string;
      storeId: string;
      humanUserId: string;
    }): Promise<void> {
      const conversation = await deps.conversations.takeOver({
        id: input.conversationId,
        storeId: input.storeId,
        humanUserId: input.humanUserId,
      });

      await deps.messages.append({
        conversationId: input.conversationId,
        storeId: input.storeId,
        sender: "HUMAN",
        content: "Agent took over the conversation.",
      });

      await eventBus.publish(
        new ConversationTakenOver(conversation.id, {
          conversationId: conversation.id,
          storeId: conversation.storeId,
          humanUserId: input.humanUserId,
          customerId: conversation.customerId,
        }),
      );
    },

    async resumeAI(input: {
      conversationId: string;
      storeId: string;
    }): Promise<void> {
      const conversation = await deps.conversations.resumeAI(
        input.conversationId,
        input.storeId,
      );

      await deps.messages.append({
        conversationId: input.conversationId,
        storeId: input.storeId,
        sender: "HUMAN",
        content: "AI resumed.",
      });

      await eventBus.publish(
        new AIResumed(conversation.id, {
          conversationId: conversation.id,
          storeId: conversation.storeId,
          customerId: conversation.customerId,
        }),
      );
    },
  };
}

export type ConversationCommands = ReturnType<typeof makeConversationCommands>;
