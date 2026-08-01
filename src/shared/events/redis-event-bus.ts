import Redis from "ioredis";
import { logger } from "@/shared/observability";
import type { DomainEvent } from "@/shared/kernel";
import type { EventBus, EventHandler } from "./event-bus";

const CHANNEL = "omniconnect:events";

interface SerializedEvent {
  name: string;
  occurredAt: string;
  aggregateId: string;
  payload: unknown;
}

function serialize(event: DomainEvent): string {
  return JSON.stringify({
    name: event.name,
    occurredAt: event.occurredAt.toISOString(),
    aggregateId: event.aggregateId,
    payload: event.payload,
  });
}

function deserialize(raw: string): DomainEvent {
  const parsed = JSON.parse(raw) as SerializedEvent;
  return {
    name: parsed.name,
    occurredAt: new Date(parsed.occurredAt),
    aggregateId: parsed.aggregateId,
    payload: parsed.payload,
  };
}

export class RedisEventBus implements EventBus {
  private readonly redisUrl: string;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private subscribed = false;
  private subscribePromise: Promise<void> | null = null;
  private readonly handlers = new Map<string, EventHandler[]>();

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
  }

  subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
    void this.ensureSubscribed();
  }

  async publish(event: DomainEvent): Promise<void> {
    const publisher = this.getPublisher();
    try {
      await publisher.publish(CHANNEL, serialize(event));
    } catch (err) {
      logger.error("redisEventBus.publishFailed", {
        error: String(err),
        eventName: event.name,
      });
      // Redis is unreachable: dispatch locally so the event is not silently lost.
      await this.dispatchLocal(event);
    }
  }

  async waitForSubscription(): Promise<void> {
    if (this.subscribePromise) {
      await this.subscribePromise;
    }
  }

  async disconnect(): Promise<void> {
    // A client that never connected (or is reconnecting) can reject quit; swallow
    // the rejection — cleanup should not mask the original publish/subscribe error.
    await this.publisher?.quit().catch(() => undefined);
    await this.subscriber?.quit().catch(() => undefined);
    this.publisher = null;
    this.subscriber = null;
    this.subscribed = false;
    this.subscribePromise = null;
  }

  private async dispatchLocal(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.name) ?? [];
    const results = await Promise.allSettled(
      handlers.map((handler) => handler(event)),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        logger.error("redisEventBus.handlerError", {
          error: String(result.reason),
          eventName: event.name,
        });
      }
    }
  }

  private getPublisher(): Redis {
    if (!this.publisher) {
      this.publisher = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });
      this.publisher.on("error", (err) => {
        logger.error("redisEventBus.publisherError", { error: String(err) });
      });
    }
    return this.publisher;
  }

  private async ensureSubscribed(): Promise<void> {
    if (this.subscribed) return;
    this.subscribed = true;

    this.subscribePromise = (async () => {
      this.subscriber = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });

      this.subscriber.on("error", (err) => {
        logger.error("redisEventBus.subscriberError", { error: String(err) });
      });

      this.subscriber.on("message", (channel, message) => {
        if (channel !== CHANNEL) return;
        try {
          const event = deserialize(message);
          void this.dispatchLocal(event);
        } catch (err) {
          logger.error("redisEventBus.invalidMessage", {
            error: String(err),
          });
        }
      });

      try {
        await this.subscriber.subscribe(CHANNEL);
      } catch (err) {
        logger.error("redisEventBus.subscribeFailed", {
          error: String(err),
        });
        this.subscribed = false;
      }
    })();

    await this.subscribePromise;
  }
}
