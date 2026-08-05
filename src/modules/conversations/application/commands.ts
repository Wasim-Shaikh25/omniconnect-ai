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
      projectId: string;
      channel: "INSTAGRAM" | "FACEBOOK";
      externalId: string;
      customerId?: string;
    }) {
      return deps.conversations.upsert(input);
    },

    async appendMessage(
      conversationId: string,
      projectId: string,
      sender: MessageSender,
      content: string,
      inReplyToMessageId?: string | null,
    ): Promise<MessageRecord> {
      return deps.messages.append({
        conversationId,
        projectId,
        sender,
        content,
        inReplyToMessageId,
      });
    },

    async setHumanActive(conversationId: string, projectId: string): Promise<void> {
      await deps.conversations.updateStatus(conversationId, projectId, "HUMAN_ACTIVE");
    },

    async takeOver(input: {
      conversationId: string;
      projectId: string;
      humanUserId: string;
    }): Promise<void> {
      const conversation = await deps.conversations.takeOver({
        id: input.conversationId,
        projectId: input.projectId,
        humanUserId: input.humanUserId,
      });

      await deps.messages.append({
        conversationId: input.conversationId,
        projectId: input.projectId,
        sender: "HUMAN",
        content: "Agent took over the conversation.",
      });

      await eventBus.publish(
        new ConversationTakenOver(conversation.id, {
          conversationId: conversation.id,
          projectId: conversation.projectId,
          humanUserId: input.humanUserId,
          customerId: conversation.customerId,
        }),
      );
    },

    async resumeAI(input: {
      conversationId: string;
      projectId: string;
    }): Promise<void> {
      const conversation = await deps.conversations.resumeAI(
        input.conversationId,
        input.projectId,
      );

      await deps.messages.append({
        conversationId: input.conversationId,
        projectId: input.projectId,
        sender: "HUMAN",
        content: "AI resumed.",
      });

      await eventBus.publish(
        new AIResumed(conversation.id, {
          conversationId: conversation.id,
          projectId: conversation.projectId,
          customerId: conversation.customerId,
        }),
      );
    },
  };
}

export type ConversationCommands = ReturnType<typeof makeConversationCommands>;
