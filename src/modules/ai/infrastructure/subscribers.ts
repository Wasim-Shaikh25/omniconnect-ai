import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import type { NewMessagePayload } from "@/modules/conversations";
import type { ProductsSyncedPayload } from "@/modules/ecommerce";
import { generateReply } from "./container";
import { aiConfigurationRepository } from "./container";

// Subscribes by event name; imports only the payload *type* from the
// conversations barrel (erased at build time) — never conversations internals.
const onNewMessage: EventHandler = async (event) => {
  const p = event.payload as NewMessagePayload;
  try {
    await generateReply({
      conversationId: p.conversationId,
      externalUserId: p.externalUserId,
      messageId: p.messageId,
    });
  } catch (error) {
    logger.error("ai.generateReply.failed", {
      conversationId: p.conversationId,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
};

function formatProductKnowledge(products: ProductsSyncedPayload["products"]): string {
  if (products.length === 0) return "No products synced yet.";
  return products
    .map((p) => {
      const inventory = p.inventory !== null && p.inventory !== undefined ? ` (in stock: ${p.inventory})` : "";
      return `- ${p.title}${inventory}`;
    })
    .join("\n");
}

const onProductsSynced: EventHandler = async (event) => {
  const p = event.payload as ProductsSyncedPayload;
  try {
    const config = await aiConfigurationRepository.getOrCreateDefault(p.projectId);
    const productText = formatProductKnowledge(p.products);
    const knowledge = ["--- Auto-synced product catalog ---", productText].join("\n");
    await aiConfigurationRepository.update(p.projectId, {
      productKnowledge: `${knowledge}\n\nLast synced: ${new Date().toISOString()}`,
    });
    logger.info("ai.productKnowledge.synced", {
      projectId: p.projectId,
      products: p.products.length,
      previousLength: config.productKnowledge?.length ?? 0,
    });
  } catch (error) {
    logger.error("ai.productKnowledge.syncFailed", {
      projectId: p.projectId,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
};

/** Wires the ai module's event subscribers. Call once at startup. */
export function registerAiSubscribers(bus: EventBus = eventBus): void {
  bus.subscribe("NewMessage", onNewMessage);
  bus.subscribe("ProductsSynced", onProductsSynced);
}
