export interface JobOptions {
  jobId?: string;
  attempts?: number;
  backoff?: { type: "exponential" | "fixed"; delay: number };
  removeOnComplete?: number;
  removeOnFail?: boolean;
}

export interface Job<T = unknown> {
  id?: string;
  name: string;
  data: T;
}

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void> | void;

export interface QueueService {
  add<T>(name: string, data: T, opts?: JobOptions): Promise<string>;
  getFailedCount(): Promise<number>;
  close(): Promise<void>;
}

export interface JobRegistry {
  register<T>(name: string, handler: JobHandler<T>): void;
  handle(job: Job<unknown>): Promise<void>;
  close(): Promise<void>;
}
