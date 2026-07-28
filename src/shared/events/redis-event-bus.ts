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
    await this.dispatchLocal(event);
    const publisher = this.getPublisher();
    try {
      await publisher.publish(CHANNEL, serialize(event));
    } catch (err) {
      logger.error("redisEventBus.publishFailed", {
        error: String(err),
        eventName: event.name,
      });
    }
  }

  private async dispatchLocal(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.name) ?? [];
    try {
      await Promise.all(handlers.map((handler) => handler(event)));
    } catch (err) {
      logger.error("redisEventBus.handlerError", {
        error: String(err),
        eventName: event.name,
      });
    }
  }

  private getPublisher(): Redis {
    if (!this.publisher) {
      this.publisher = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });
    }
    return this.publisher;
  }

  private async ensureSubscribed(): Promise<void> {
    if (this.subscribed) return;
    this.subscribed = true;

    this.subscriber = new Redis(this.redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      retryStrategy: (times) => Math.min(times * 50, 2000),
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
  }
}
