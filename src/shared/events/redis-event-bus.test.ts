import { describe, expect, it, vi } from "vitest";
import { RedisEventBus } from "./redis-event-bus";

function makeEvent(name: string) {
  return {
    eventId: `evt-${name}-${Date.now()}`,
    name,
    occurredAt: new Date(),
    aggregateId: "aggregate-1",
    payload: { value: 42 },
  };
}

const redisUrl = process.env.REDIS_URL;
const withRedis = redisUrl ? describe : describe.skip;

withRedis("RedisEventBus", () => {
  it("dispatches each published event exactly once per instance", async () => {
    const bus = new RedisEventBus(redisUrl!);
    const handler = vi.fn();
    bus.subscribe("TestEvent", handler);
    await bus.waitForSubscription();

    await bus.publish(makeEvent("TestEvent"));
    // Wait until the first delivery, then give any Redis-echoed second delivery
    // time to arrive so duplicate dispatches are caught.
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1), {
      timeout: 3000,
      interval: 50,
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(handler).toHaveBeenCalledTimes(1);

    await bus.disconnect();
  });

  it("falls back to a single local dispatch when Redis is unreachable", async () => {
    const bus = new RedisEventBus("redis://127.0.0.1:1");
    const handler = vi.fn();
    bus.subscribe("TestEvent", handler);

    await bus.publish(makeEvent("TestEvent"));

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1), {
      timeout: 5000,
      interval: 50,
    });

    await bus.disconnect();
  });
});
