import { logger } from "@/shared/observability";
import { getQueue, jobRegistry } from "@/shared/queue";
import type { QueueService } from "@/shared/queue/types";
import type { DomainEvent } from "@/shared/kernel";
import type { EventBus, EventHandler } from "./event-bus";

export const EVENTS_QUEUE = "events";

interface SerializedEvent {
  eventId: string;
  name: string;
  occurredAt: string;
  aggregateId: string;
  payload: unknown;
}

function serialize(event: DomainEvent): string {
  return JSON.stringify({
    eventId: event.eventId,
    name: event.name,
    occurredAt: event.occurredAt.toISOString(),
    aggregateId: event.aggregateId,
    payload: event.payload,
  });
}

function deserialize(raw: string): DomainEvent {
  const parsed = JSON.parse(raw) as SerializedEvent;
  return {
    eventId: parsed.eventId,
    name: parsed.name,
    occurredAt: new Date(parsed.occurredAt),
    aggregateId: parsed.aggregateId,
    payload: parsed.payload,
  };
}

function jobDataToString(data: unknown): string {
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

export class QueueEventBus implements EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();
  private readonly queueName: string;
  private queue?: QueueService;
  private queuePromise?: Promise<QueueService>;

  constructor(queueOrName: QueueService | string = EVENTS_QUEUE) {
    if (typeof queueOrName === "object") {
      this.queue = queueOrName;
      this.queueName = queueOrName ? "provided" : EVENTS_QUEUE;
    } else {
      this.queueName = queueOrName;
    }
  }

  private async getQueueService(): Promise<QueueService> {
    if (this.queue) return this.queue;
    if (!this.queuePromise) {
      this.queuePromise = getQueue(this.queueName);
    }
    this.queue = await this.queuePromise;
    return this.queue;
  }

  subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);

    // Register a BullMQ job handler so a worker can dispatch this event.
    // The registry is global; multiple subscriptions to the same name overwrite idempotently.
    jobRegistry.register<unknown>(eventName, async (job) => {
      const event = deserialize(jobDataToString(job.data));
      await this.dispatchLocal(event);
    });
  }

  async publish(event: DomainEvent): Promise<void> {
    const queue = await this.getQueueService();
    await queue.add(event.name, serialize(event), {
      jobId: event.eventId,
      attempts: 5,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: 1_000,
      removeOnFail: false,
    });
    logger.info("queueEventBus.published", {
      eventName: event.name,
      eventId: event.eventId,
    });
  }

  private async dispatchLocal(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.name) ?? [];
    const results = await Promise.allSettled(
      handlers.map((handler) => handler(event)),
    );
    let firstError: unknown;
    for (const result of results) {
      if (result.status === "rejected") {
        logger.error("queueEventBus.handlerError", {
          eventName: event.name,
          eventId: event.eventId,
          error: String(result.reason),
        });
        if (!firstError) firstError = result.reason;
      }
    }
    if (firstError) throw firstError;
  }
}
