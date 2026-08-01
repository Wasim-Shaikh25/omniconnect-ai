import { DomainEvent } from "@/shared/kernel";
import { logger } from "@/shared/observability";

export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T,
) => void | Promise<void>;

/**
 * The event bus decouples publishers from subscribers. Publishers never know who
 * consumes their events. A durable BullMQ-backed implementation replaces this
 * in-memory bus for cross-process/async delivery (see infrastructure).
 */
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.name) ?? [];
    const results = await Promise.allSettled(
      handlers.map((handler) => handler(event)),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        logger.error("inMemoryEventBus.handlerError", {
          eventName: event.name,
          error: String(result.reason),
        });
      }
    }
  }
}
