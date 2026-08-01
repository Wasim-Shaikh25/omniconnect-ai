import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import { InMemoryQueue } from "./in-memory-queue";
import { jobRegistry } from "./registry";
import type { QueueService, JobHandler } from "./types";

const queues = new Map<string, Promise<QueueService>>();

export async function getQueue(name: string): Promise<QueueService> {
  const existing = queues.get(name);
  if (existing) return existing;

  if (env.NODE_ENV === "production" && !env.REDIS_URL) {
    throw new Error("REDIS_URL is required for BullMQ queues in production");
  }

  const promise = env.REDIS_URL ? createBullMQQueue(name, env.REDIS_URL) : Promise.resolve(new InMemoryQueue(name));
  queues.set(name, promise);

  const queue = await promise;
  logger.info("queue.created", { name, backend: env.REDIS_URL ? "bullmq" : "in-memory" });
  return queue;
}

async function createBullMQQueue(name: string, redisUrl: string): Promise<QueueService> {
  const { BullMQQueue } = await import("./bullmq-queue");
  return new BullMQQueue(name, redisUrl);
}

export async function closeQueues(): Promise<void> {
  for (const [name, promise] of queues.entries()) {
    const queue = await promise;
    await queue.close();
    queues.delete(name);
  }
}

export { jobRegistry, type JobHandler };
