import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus } from "@/shared/events";
import { AbandonedCartDetected } from "../domain/events";
import { makeAbandonedCartSweep } from "./abandoned-cart-sweep";
import type { CartRecord, CartRepository } from "./ports";

function cartFixture(overrides: Partial<CartRecord> = {}): CartRecord {
  return {
    id: "cart-1",
    projectId: "store-1",
    cartToken: "token-1",
    email: "customer@example.com",
    lineItemTitles: ["T-Shirt"],
    totalPrice: 29.99,
    currency: "USD",
    recoveredUrl: "https://example.com/checkout",
    lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    notifiedAt: null,
    convertedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeFakeCarts(records: CartRecord[] = []): CartRepository {
  const notified = new Set<string>();
  return {
    upsert: vi.fn(),
    findByStoreAndToken: vi.fn(),
    markConverted: vi.fn(),
    markNotified: vi.fn(async (id) => {
      if (notified.has(id)) return false;
      notified.add(id);
      return true;
    }),
    findAbandoned: vi.fn(async (_thresholdMinutes, limit = 500) =>
      records.filter((r) => !notified.has(r.id) && !r.convertedAt && !r.notifiedAt).slice(0, limit),
    ),
  };
}

describe("abandonedCartSweep", () => {
  it("publishes one AbandonedCartDetected event per idle cart and marks notified", async () => {
    const carts = makeFakeCarts([cartFixture()]);
    const eventBus = new InMemoryEventBus();
    const handler = vi.fn();
    eventBus.subscribe("AbandonedCartDetected", handler);
    const sweep = makeAbandonedCartSweep({ carts, eventBus });

    const published = await sweep();

    expect(published).toBe(1);
    expect(carts.markNotified).toHaveBeenCalledWith("cart-1");
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as AbandonedCartDetected;
    expect(event.payload.cartId).toBe("cart-1");
    expect(event.eventId).toBe("cart-abandoned-cart-1");
  });

  it("does not publish an event for a cart that has already been notified", async () => {
    const carts = makeFakeCarts([cartFixture({ notifiedAt: new Date() })]);
    const eventBus = new InMemoryEventBus();
    const handler = vi.fn();
    eventBus.subscribe("AbandonedCartDetected", handler);
    const sweep = makeAbandonedCartSweep({ carts, eventBus });

    const published = await sweep();

    expect(published).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not publish an event for a converted cart", async () => {
    const carts = makeFakeCarts([cartFixture({ convertedAt: new Date() })]);
    const eventBus = new InMemoryEventBus();
    const handler = vi.fn();
    eventBus.subscribe("AbandonedCartDetected", handler);
    const sweep = makeAbandonedCartSweep({ carts, eventBus });

    const published = await sweep();

    expect(published).toBe(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not duplicate events when run twice", async () => {
    const carts = makeFakeCarts([cartFixture()]);
    const eventBus = new InMemoryEventBus();
    const handler = vi.fn();
    eventBus.subscribe("AbandonedCartDetected", handler);
    const sweep = makeAbandonedCartSweep({ carts, eventBus });

    await sweep();
    await sweep();

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
