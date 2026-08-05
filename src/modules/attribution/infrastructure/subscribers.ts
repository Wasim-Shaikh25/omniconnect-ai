import type { EventBus, EventHandler } from "@/shared/events";
import type { OrderSyncedPayload } from "@/modules/ecommerce";
import { recordConversion } from "./container";

function isOrderSynced(event: { name: string; payload: unknown }): event is { name: "OrderSynced"; payload: OrderSyncedPayload } {
  return event.name === "OrderSynced" && typeof event.payload === "object" && event.payload !== null;
}

export function registerAttributionSubscribers(bus: EventBus): void {
  const handler: EventHandler = async (event) => {
    if (!isOrderSynced(event)) return;
    await recordConversion(event.payload.projectId, event.payload.order);
  };

  bus.subscribe("OrderSynced", handler);
}
