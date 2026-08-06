import { logger } from "@/shared/observability";
import { randomId } from "@/shared/security/random";
import { jobRegistry } from "./registry";
import type { Job, JobCounts, JobOptions, QueueService } from "./types";

const MAX_TIMEOUT_MS = 2_147_483_647; // largest delay setTimeout reliably supports (~24.8 days)

export class InMemoryQueue implements QueueService {
  private jobs: Job<unknown>[] = [];
  private processing = false;
  private jobIds = new Set<string>();
  private timers: NodeJS.Timeout[] = [];

  constructor(private name: string) {}

  async getFailedCount(): Promise<number> {
    return 0;
  }

  async getJobCounts(): Promise<JobCounts> {
    return {
      waiting: this.jobs.length,
      active: this.processing ? 1 : 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    };
  }

  async add<T>(name: string, data: T, opts?: JobOptions): Promise<string> {
    const id = opts?.jobId ?? `${this.name}:${Date.now()}:${randomId()}`;
    if (this.jobIds.has(id)) {
      logger.info("queue.inMemory.duplicate", { queue: this.name, jobId: id, jobName: name });
      return id;
    }
    this.jobIds.add(id);
    const job: Job<T> = { id, name, data };

    const requestedDelay = opts?.delay ?? 0;
    if (requestedDelay > 0) {
      const delay = Math.min(requestedDelay, MAX_TIMEOUT_MS);
      if (delay < requestedDelay) {
        logger.warn("queue.inMemory.delayCapped", { queue: this.name, jobId: id, jobName: name, requestedDelay, delay });
      } else {
        logger.info("queue.inMemory.delayed", { queue: this.name, jobId: id, jobName: name, delay });
      }
      const timer = setTimeout(() => {
        this.jobs.push(job);
        this.processNext();
      }, delay);
      this.timers.push(timer);
    } else {
      this.jobs.push(job);
      logger.info("queue.inMemory.added", { queue: this.name, jobId: id, jobName: name });
      setImmediate(() => this.processNext());
    }
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
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers = [];
    this.jobs = [];
  }
}
