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
        storeId: input.storeId ?? null,
        type: input.type,
        channel: input.channel ?? "IN_APP",
        title: input.title,
        body: input.body,
        payload: input.payload
          ? (input.payload as Prisma.InputJsonValue)
          : undefined,
      },
    });
    return toRecord(created);
  }

  async listByUser(
    userId: string,
    limit = 50,
  ): Promise<NotificationRecord[]> {
    const rows = await prisma.notification.findMany({
      where: { userId },
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
}

function toRecord(row: {
  id: string;
  userId: string;
  storeId: string | null;
  type: string;
  channel: string;
  title: string;
  body: string;
  payload: unknown;
  read: boolean;
  createdAt: Date;
}): NotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    storeId: row.storeId,
    type: row.type as NotificationRecord["type"],
    channel: row.channel as NotificationRecord["channel"],
    title: row.title,
    body: row.body,
    payload: row.payload as unknown | null,
    read: row.read,
    createdAt: row.createdAt,
  };
}
