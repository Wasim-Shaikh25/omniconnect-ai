import type { DomainEvent } from "@/shared/kernel";
import type { EventBus, EventHandler } from "./event-bus";

export type { EventBus, EventHandler } from "./event-bus";
export { InMemoryEventBus } from "./event-bus";

/**
 * Stable process-wide event bus. Client builds use an in-memory bus; the server
 * installs a durable QueueEventBus during startup (see src/server/subscribers.ts
 * and src/jobs/worker.ts) without breaking live bindings.
 */
class LazyEventBus implements EventBus {
  private target: EventBus | null = null;
  private readonly pending = new Map<string, EventHandler[]>();

  subscribe(eventName: string, handler: EventHandler): void {
    if (this.target) {
      this.target.subscribe(eventName, handler);
      return;
    }
    const handlers = this.pending.get(eventName) ?? [];
    handlers.push(handler);
    this.pending.set(eventName, handlers);
  }

  async publish(event: DomainEvent): Promise<void> {
    if (this.target) {
      return this.target.publish(event);
    }
    const handlers = this.pending.get(event.name) ?? [];
    await Promise.allSettled(handlers.map((handler) => handler(event)));
  }

  install(target: EventBus): void {
    this.target = target;
    for (const [eventName, handlers] of this.pending.entries()) {
      for (const handler of handlers) {
        target.subscribe(eventName, handler);
      }
    }
    this.pending.clear();
  }
}

export const eventBus: EventBus = new LazyEventBus();

/** Replace the in-memory fallback with a durable bus on the server. */
export function setEventBus(bus: EventBus): void {
  if (eventBus instanceof LazyEventBus) {
    eventBus.install(bus);
  }
}
