import { env } from "@/shared/config";
import { InMemoryEventBus, type EventBus } from "./event-bus";
import { RedisEventBus } from "./redis-event-bus";

export type { EventBus, EventHandler } from "./event-bus";
export { InMemoryEventBus } from "./event-bus";

function createBus(): EventBus {
  if (env.REDIS_URL) {
    return new RedisEventBus(env.REDIS_URL);
  }
  return new InMemoryEventBus();
}

/** Process-wide event bus singleton. Uses Redis Pub/Sub when `REDIS_URL` is set. */
export const eventBus: EventBus = createBus();
