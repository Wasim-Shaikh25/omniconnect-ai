import { prisma } from "@/shared/database";
import {
  NotificationPreferenceRecord,
  NotificationPreferenceRepository,
} from "../application/ports";

function toRecord(row: {
  id: string;
  userId: string;
  channel: string;
  eventType: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): NotificationPreferenceRecord {
  return { ...row };
}

export class PrismaNotificationPreferenceRepository
  implements NotificationPreferenceRepository
{
  async listForUser(userId: string, limit = 1000): Promise<NotificationPreferenceRecord[]> {
    const rows = await prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: [{ eventType: "asc" }, { channel: "asc" }],
      take: limit,
    });
    return rows.map(toRecord);
  }

  async upsert(input: {
    userId: string;
    channel: string;
    eventType: string;
    enabled: boolean;
  }): Promise<NotificationPreferenceRecord> {
    const row = await prisma.notificationPreference.upsert({
      where: {
        userId_channel_eventType: {
          userId: input.userId,
          channel: input.channel,
          eventType: input.eventType,
        },
      },
      create: {
        userId: input.userId,
        channel: input.channel,
        eventType: input.eventType,
        enabled: input.enabled,
      },
      update: { enabled: input.enabled },
    });
    return toRecord(row);
  }
}
