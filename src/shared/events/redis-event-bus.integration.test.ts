import { describe, it, expect, vi } from "vitest";
import { RedisEventBus } from "./redis-event-bus";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

function makeEvent(name: string) {
  return {
    eventId: `evt-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    occurredAt: new Date(),
    aggregateId: "aggregate-1",
    payload: { value: 42 },
  };
}

describe("RedisEventBus integration", () => {
  it("dispatches an event exactly once per subscribing instance across two buses", async () => {
    const busA = new RedisEventBus(redisUrl);
    const busB = new RedisEventBus(redisUrl);

    const handlerA = vi.fn();
    const handlerB = vi.fn();

    busA.subscribe("TestEvent", handlerA);
    busB.subscribe("TestEvent", handlerB);

    await busA.waitForSubscription();
    await busB.waitForSubscription();

    // Give subscriptions a moment to settle before publishing.
    await new Promise((resolve) => setTimeout(resolve, 200));

    const event = makeEvent("TestEvent");
    await busA.publish(event);

    await vi.waitFor(
      () => {
        expect(handlerA).toHaveBeenCalledTimes(1);
        expect(handlerB).toHaveBeenCalledTimes(1);
      },
      { timeout: 5000, interval: 100 },
    );

    // No extra deliveries after a grace period.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);

    // The publisher bus should not also run its own handler on the happy path.
    expect(handlerA).toHaveBeenCalledWith(event);
    expect(handlerB).toHaveBeenCalledWith(event);

    await busA.disconnect();
    await busB.disconnect();
  });
});
