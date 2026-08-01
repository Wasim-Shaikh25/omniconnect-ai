import { logger } from "@/shared/observability";
import { randomId } from "@/shared/security/random";
import { jobRegistry } from "./registry";
import type { Job, JobOptions, QueueService } from "./types";

export class InMemoryQueue implements QueueService {
  private jobs: Job<unknown>[] = [];
  private processing = false;
  private jobIds = new Set<string>();

  constructor(private name: string) {}

  async getFailedCount(): Promise<number> {
    return 0;
  }

  async add<T>(name: string, data: T, opts?: JobOptions): Promise<string> {
    const id = opts?.jobId ?? `${this.name}:${Date.now()}:${randomId()}`;
    if (this.jobIds.has(id)) {
      logger.info("queue.inMemory.duplicate", { queue: this.name, jobId: id, jobName: name });
      return id;
    }
    this.jobIds.add(id);
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
