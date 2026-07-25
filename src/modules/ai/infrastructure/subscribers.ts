import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import type { NewMessagePayload } from "@/modules/conversations";
import { generateReply } from "./container";

// Subscribes by event name; imports only the payload *type* from the
// conversations barrel (erased at build time) — never conversations internals.
const onNewMessage: EventHandler = async (event) => {
  const p = event.payload as NewMessagePayload;
  try {
    await generateReply(p.conversationId);
  } catch (error) {
    logger.error("ai.generateReply.failed", {
      conversationId: p.conversationId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
};

/** Wires the ai module's event subscribers. Call once at startup. */
export function registerAiSubscribers(bus: EventBus = eventBus): void {
  bus.subscribe("NewMessage", onNewMessage);
}
