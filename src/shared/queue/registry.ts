import { logger } from "@/shared/observability";
import type { Job, JobHandler, JobRegistry } from "./types";

class Registry implements JobRegistry {
  private handlers = new Map<string, JobHandler<unknown>>();

  register<T>(name: string, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler<unknown>);
  }

  async handle(job: Job<unknown>): Promise<void> {
    const handler = this.handlers.get(job.name);
    if (!handler) {
      logger.warn("queue.handler.missing", { jobName: job.name, jobId: job.id });
      return;
    }
    await handler(job);
  }

  close(): Promise<void> {
    this.handlers.clear();
    return Promise.resolve();
  }
}

export const jobRegistry: JobRegistry = new Registry();
