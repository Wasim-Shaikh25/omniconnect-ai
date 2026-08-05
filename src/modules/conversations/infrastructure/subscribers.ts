import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import type { MetaMessageReceivedPayload } from "@/modules/meta";
import { NewMessage } from "../domain/events";
import { PrismaConversationRepository } from "./conversation.repository";
import { PrismaMessageRepository } from "./message.repository";

const conversations = new PrismaConversationRepository();
const messages = new PrismaMessageRepository();

// Subscribes by event name; imports only the payload *type* from the meta
// barrel (erased at build time) — never meta internals.
const onMetaMessageReceived: EventHandler = async (event) => {
  const p = event.payload as MetaMessageReceivedPayload;
  // Key the conversation by the sender's external user id so the thread is
  // stable across messages. The message id (externalConversationId) is not
  // a stable thread key for live Meta messages.
  const conversation = await conversations.upsert({
    projectId: p.projectId,
    channel: p.channel,
    externalId: p.externalUserId,
  });
  const message = await messages.append({
    conversationId: conversation.id,
    projectId: p.projectId,
    sender: "CUSTOMER",
    content: p.text,
  });
  logger.info("conversations.messageAppended", {
    projectId: p.projectId,
    conversationId: conversation.id,
  });

  await eventBus.publish(
    new NewMessage(
      conversation.id,
      {
        conversationId: conversation.id,
        projectId: p.projectId,
        channel: p.channel,
        externalUserId: p.externalUserId,
        customerId: conversation.customerId,
        content: message.content,
        messageId: message.id,
      },
      `message-${message.id}`,
    ),
  );
};

/** Wires the conversations module's event subscribers. Call once at startup. */
export function registerConversationsSubscribers(
  bus: EventBus = eventBus,
): void {
  bus.subscribe("MetaMessageReceived", onMetaMessageReceived);
}
