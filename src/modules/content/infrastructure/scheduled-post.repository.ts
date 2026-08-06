import { prisma } from "@/shared/database";
import type { ContentMediaType } from "@/modules/meta";
import type { ScheduledPostRecord, ScheduledPostRepository, ScheduledPostStatus } from "../application/ports";

function mapRecord(row: {
  id: string;
  projectId: string;
  userId: string;
  caption: string | null;
  mediaType: string;
  mediaUrls: string[];
  status: string;
  scheduledAt: Date;
  publishedAt: Date | null;
  externalId: string | null;
  jobId: string | null;
  errorMessage: string | null;
  scheduledAtTimezone: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ScheduledPostRecord {
  return {
    ...row,
    mediaType: row.mediaType as ContentMediaType,
    status: row.status as ScheduledPostStatus,
  };
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export class PrismaScheduledPostRepository implements ScheduledPostRepository {
  async create(
    input: Parameters<ScheduledPostRepository["create"]>[0],
  ): Promise<ScheduledPostRecord> {
    const row = await prisma.scheduledPost.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        caption: input.caption,
        mediaType: input.mediaType,
        mediaUrls: input.mediaUrls,
        status: input.status ?? "SCHEDULED",
        scheduledAt: input.scheduledAt,
        scheduledAtTimezone: input.scheduledAtTimezone,
      },
    });
    return mapRecord(row);
  }

  async findById(id: string): Promise<ScheduledPostRecord | null> {
    const row = await prisma.scheduledPost.findUnique({ where: { id } });
    return row ? mapRecord(row) : null;
  }

  async countByUserThisMonth(userId: string, now = new Date()): Promise<number> {
    const monthStart = startOfMonth(now);
    return prisma.scheduledPost.count({
      where: {
        userId,
        status: { not: "CANCELLED" },
        createdAt: { gte: monthStart },
      },
    });
  }

  async update(
    id: string,
    data: Parameters<ScheduledPostRepository["update"]>[1],
  ): Promise<ScheduledPostRecord | null> {
    const row = await prisma.scheduledPost.update({
      where: { id },
      data: {
        status: data.status,
        externalId: data.externalId,
        errorMessage: data.errorMessage,
        publishedAt: data.publishedAt,
        jobId: data.jobId,
      },
    });
    return mapRecord(row);
  }

  async listByProject(projectId: string, limit = 50): Promise<ScheduledPostRecord[]> {
    const rows = await prisma.scheduledPost.findMany({
      where: { projectId },
      orderBy: { scheduledAt: "desc" },
      take: limit,
    });
    return rows.map(mapRecord);
  }
}

export const scheduledPostRepository: ScheduledPostRepository = new PrismaScheduledPostRepository();
