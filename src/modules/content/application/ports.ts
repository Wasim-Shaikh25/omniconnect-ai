import type { ContentMediaType } from "@/modules/meta";

export type ScheduledPostStatus =
  | "SCHEDULED"
  | "PUBLISHED"
  | "FAILED"
  | "CANCELLED";

export interface ScheduledPostRecord {
  id: string;
  projectId: string;
  userId: string;
  caption: string | null;
  mediaType: ContentMediaType;
  mediaUrls: string[];
  status: ScheduledPostStatus;
  scheduledAt: Date;
  publishedAt: Date | null;
  externalId: string | null;
  jobId: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledPostRepository {
  create(
    input: Omit<
      ScheduledPostRecord,
      "id" | "createdAt" | "updatedAt" | "status" | "publishedAt" | "externalId" | "errorMessage" | "jobId"
    > & { status?: ScheduledPostStatus },
  ): Promise<ScheduledPostRecord>;
  findById(id: string): Promise<ScheduledPostRecord | null>;
  countByUserThisMonth(userId: string, now?: Date): Promise<number>;
  update(
    id: string,
    data: Partial<
      Pick<ScheduledPostRecord, "status" | "externalId" | "errorMessage" | "publishedAt" | "jobId">
    >,
  ): Promise<ScheduledPostRecord | null>;
  listByProject(projectId: string, limit?: number): Promise<ScheduledPostRecord[]>;
}
