export interface JobOptions {
  jobId?: string;
  attempts?: number;
  backoff?: { type: "exponential" | "fixed"; delay: number };
  removeOnComplete?: number;
  removeOnFail?: boolean;
  /** Delay in milliseconds before the job becomes eligible for processing. */
  delay?: number;
}

export interface Job<T = unknown> {
  id?: string;
  name: string;
  data: T;
}

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void> | void;

export interface JobCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface QueueService {
  add<T>(name: string, data: T, opts?: JobOptions): Promise<string>;
  remove(jobId: string): Promise<void>;
  getFailedCount(): Promise<number>;
  getJobCounts(): Promise<JobCounts>;
  close(): Promise<void>;
}

export interface JobRegistry {
  register<T>(name: string, handler: JobHandler<T>): void;
  handle(job: Job<unknown>): Promise<void>;
  close(): Promise<void>;
}
