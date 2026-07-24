import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import type { MetaMessageReceivedPayload } from "@/modules/meta";
import { PrismaConversationRepository } from "./conversation.repository";
import { PrismaMessageRepository } from "./message.repository";

const conversations = new PrismaConversationRepository();
const messages = new PrismaMessageRepository();

// Subscribes by event name; imports only the payload *type* from the meta
// barrel (erased at build time) — never meta internals.
const onMetaMessageReceived: EventHandler = async (event) => {
  const p = event.payload as MetaMessageReceivedPayload;
  const conversation = await conversations.upsert({
    storeId: p.storeId,
    channel: p.channel,
    externalId: p.externalConversationId ?? p.externalUserId,
  });
  await messages.append({
    conversationId: conversation.id,
    sender: "CUSTOMER",
    content: p.text,
  });
  logger.info("conversations.messageAppended", {
    storeId: p.storeId,
    conversationId: conversation.id,
  });
};

/** Wires the conversations module's event subscribers. Call once at startup. */
export function registerConversationsSubscribers(
  bus: EventBus = eventBus,
): void {
  bus.subscribe("MetaMessageReceived", onMetaMessageReceived);
}
