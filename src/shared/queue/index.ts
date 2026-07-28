import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import { BullMQQueue } from "./bullmq-queue";
import { InMemoryQueue } from "./in-memory-queue";
import { jobRegistry } from "./registry";
import type { QueueService, JobHandler } from "./types";

const queues = new Map<string, QueueService>();

export function getQueue(name: string): QueueService {
  const existing = queues.get(name);
  if (existing) return existing;

  if (env.NODE_ENV === "production" && !env.REDIS_URL) {
    throw new Error("REDIS_URL is required for BullMQ queues in production");
  }

  const queue = env.REDIS_URL
    ? new BullMQQueue(name, env.REDIS_URL)
    : new InMemoryQueue(name);

  queues.set(name, queue);
  logger.info("queue.created", { name, backend: env.REDIS_URL ? "bullmq" : "in-memory" });
  return queue;
}

export async function closeQueues(): Promise<void> {
  for (const [name, queue] of queues.entries()) {
    await queue.close();
    queues.delete(name);
  }
}

export { jobRegistry, type JobHandler };
