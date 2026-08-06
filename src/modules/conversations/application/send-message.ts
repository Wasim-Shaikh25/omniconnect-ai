import { logger } from "@/shared/observability";
import type { MetaService } from "@/modules/meta";
import type {
  ConversationRepository,
  MessageRecord,
  MessageRepository,
} from "./ports";

export interface SendMessageInput {
  conversationId: string;
  projectId: string;
  sender: "HUMAN" | "AI";
  content: string;
}

export function makeSendMessage(deps: {
  conversations: ConversationRepository;
  messages: MessageRepository;
  sendMessage: MetaService["sendMessage"];
}) {
  return async function sendMessage(input: SendMessageInput): Promise<MessageRecord> {
    const conversation = await deps.conversations.findById(
      input.conversationId,
      input.projectId,
    );
    if (!conversation || conversation.projectId !== input.projectId) {
      throw new Error("Conversation not found");
    }

    const trimmed = input.content.trim();
    if (!trimmed) throw new Error("Message cannot be empty");
    if (trimmed.length > 2000) throw new Error("Message is too long");

    const message = await deps.messages.append({
      conversationId: input.conversationId,
      projectId: input.projectId,
      sender: input.sender,
      content: trimmed,
    });

    if (
      conversation.externalId &&
      (conversation.channel === "INSTAGRAM" || conversation.channel === "FACEBOOK")
    ) {
      try {
        await deps.sendMessage({
          projectId: input.projectId,
          recipientId: conversation.externalId,
          text: trimmed,
        });
      } catch (error) {
        logger.warn("conversations.sendMessage.failed", {
          conversationId: input.conversationId,
          projectId: input.projectId,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    return message;
  };
}

export type SendMessage = ReturnType<typeof makeSendMessage>;
