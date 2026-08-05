import { prisma } from "@/shared/database";
import type { Prisma } from "@prisma/client";
import type {
  CreateNotificationInput,
  NotificationRecord,
  NotificationRepository,
} from "../application/ports";

export class PrismaNotificationRepository implements NotificationRepository {
  async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    const created = await prisma.notification.create({
      data: {
        userId: input.userId,
        projectId: input.projectId ?? null,
        type: input.type,
        channel: input.channel ?? "IN_APP",
        tier: input.tier ?? "TODAY_FEED",
        title: input.title,
        body: input.body,
        payload: input.payload
          ? (input.payload as Prisma.InputJsonValue)
          : undefined,
        dedupKey: input.dedupKey ?? null,
      },
    });
    return toRecord(created);
  }

  async listByUser(
    userId: string,
    options: { limit?: number; offset?: number; search?: string } = {},
  ): Promise<NotificationRecord[]> {
    const where: { userId: string; OR?: { title?: { contains: string; mode: "insensitive" }; body?: { contains: string; mode: "insensitive" } }[] } = { userId };
    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: "insensitive" } },
        { body: { contains: options.search, mode: "insensitive" } },
      ];
    }
    const rows = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: options.offset ?? 0,
      take: options.limit ?? 50,
    });
    return rows.map(toRecord);
  }

  async countByUser(userId: string, search?: string): Promise<number> {
    const where: { userId: string; OR?: { title?: { contains: string; mode: "insensitive" }; body?: { contains: string; mode: "insensitive" } }[] } = { userId };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { body: { contains: search, mode: "insensitive" } },
      ];
    }
    return prisma.notification.count({ where });
  }

  async findRecentByDedupKey(dedupKey: string, since: Date, limit = 10): Promise<NotificationRecord[]> {
    const rows = await prisma.notification.findMany({
      where: { dedupKey, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async countUnreadByUser(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllReadByUser(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return result.count;
  }
}

function toRecord(row: {
  id: string;
  userId: string;
  projectId: string | null;
  type: string;
  channel: string;
  tier: string;
  title: string;
  body: string;
  payload: unknown;
  dedupKey: string | null;
  read: boolean;
  createdAt: Date;
}): NotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    type: row.type as NotificationRecord["type"],
    channel: row.channel as NotificationRecord["channel"],
    tier: row.tier as NotificationRecord["tier"],
    title: row.title,
    body: row.body,
    payload: row.payload as unknown | null,
    dedupKey: row.dedupKey,
    read: row.read,
    createdAt: row.createdAt,
  };
}
