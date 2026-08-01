import { Queue } from "bullmq";
import Redis from "ioredis";
import { logger } from "@/shared/observability";
import type { QueueService, JobOptions } from "./types";

export class BullMQQueue implements QueueService {
  private queue: Queue;
  private connection: Redis;

  constructor(name: string, redisUrl: string) {
    this.connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.queue = new Queue(name, { connection: this.connection });
  }

  async add<T>(name: string, data: T, opts?: JobOptions): Promise<string> {
    const job = await this.queue.add(name, data, opts as Parameters<Queue["add"]>[2]);
    logger.info("queue.bullmq.added", { queue: this.queue.name, jobId: job.id, jobName: name });
    return job.id ?? "";
  }

  async getFailedCount(): Promise<number> {
    return this.queue.getFailedCount();
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
