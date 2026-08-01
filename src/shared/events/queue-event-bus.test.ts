import { describe, expect, it, vi } from "vitest";
import { QueueEventBus } from "./queue-event-bus";
import { InMemoryQueue } from "@/shared/queue/in-memory-queue";
import { BaseDomainEvent } from "@/shared/kernel";

class TestEvent extends BaseDomainEvent<{ value: number }> {
  readonly name = "TestEvent";
}

function makeBus() {
  return new QueueEventBus(new InMemoryQueue("events"));
}

describe("QueueEventBus", () => {
  it("dispatches a published event to subscribers", async () => {
    const bus = makeBus();
    const handler = vi.fn().mockResolvedValue(undefined);
    bus.subscribe("TestEvent", handler);

    await bus.publish(new TestEvent("agg-1", { value: 42 }));

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ name: "TestEvent", aggregateId: "agg-1" }),
    );
  });

  it("allows one subscriber to fail without killing the other", async () => {
    const bus = makeBus();
    const failing = vi.fn().mockRejectedValue(new Error("boom"));
    const succeeding = vi.fn().mockResolvedValue(undefined);
    bus.subscribe("TestEvent", failing);
    bus.subscribe("TestEvent", succeeding);

    await bus.publish(new TestEvent("agg-2", { value: 1 }));

    await vi.waitFor(() => {
      expect(failing).toHaveBeenCalledTimes(1);
      expect(succeeding).toHaveBeenCalledTimes(1);
    });
  });

  it("deduplicates events by eventId when using a jobId", async () => {
    const bus = makeBus();
    const handler = vi.fn().mockResolvedValue(undefined);
    bus.subscribe("TestEvent", handler);

    const event = new TestEvent("agg-3", { value: 1 }, "evt-3");
    await bus.publish(event);
    await bus.publish(event);

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
  });
});
