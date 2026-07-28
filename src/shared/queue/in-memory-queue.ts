import { logger } from "@/shared/observability";
import { randomId } from "@/shared/security/random";
import { jobRegistry } from "./registry";
import type { Job, QueueService } from "./types";

export class InMemoryQueue implements QueueService {
  private jobs: Job<unknown>[] = [];
  private processing = false;

  constructor(private name: string) {}

  async add<T>(name: string, data: T): Promise<string> {
    const id = `${this.name}:${Date.now()}:${randomId()}`;
    const job: Job<T> = { id, name, data };
    this.jobs.push(job);
    logger.info("queue.inMemory.added", { queue: this.name, jobId: id, jobName: name });
    setImmediate(() => this.processNext());
    return id;
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      const job = this.jobs.shift();
      if (job) {
        logger.info("queue.inMemory.processing", { queue: this.name, jobId: job.id, jobName: job.name });
        await jobRegistry.handle(job);
      }
    } catch (error) {
      logger.error("queue.inMemory.error", {
        queue: this.name,
        error: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      this.processing = false;
      if (this.jobs.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  async close(): Promise<void> {
    this.jobs = [];
  }
}
