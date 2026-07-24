import { InMemoryEventBus, type EventBus } from "./event-bus";

export type { EventBus, EventHandler } from "./event-bus";
export { InMemoryEventBus } from "./event-bus";

/** Process-wide event bus singleton (swap for a BullMQ-backed bus in production). */
export const eventBus: EventBus = new InMemoryEventBus();
