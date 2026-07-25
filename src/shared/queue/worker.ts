import { Worker } from "bullmq";
import Redis from "ioredis";
import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import { jobRegistry } from "./registry";

const workers: Worker[] = [];

function createRedisConnection() {
  if (!env.REDIS_URL) throw new Error("REDIS_URL is required for BullMQ worker");
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function startBullMQWorker(queueName: string, concurrency = 1): Worker {
  const connection = createRedisConnection();
  const worker = new Worker(
    queueName,
    async (job) => {
      await jobRegistry.handle({ id: job.id ?? undefined, name: job.name, data: job.data });
    },
    { connection, concurrency, autorun: true },
  );

  worker.on("completed", (job) => {
    logger.info("queue.bullmq.completed", { queue: queueName, jobId: job?.id, jobName: job?.name });
  });

  worker.on("failed", (job, err) => {
    logger.error("queue.bullmq.failed", {
      queue: queueName,
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
    });
  });

  workers.push(worker);
  return worker;
}

export async function closeWorkers(): Promise<void> {
  for (const worker of workers) {
    await worker.close();
  }
  workers.length = 0;
}
