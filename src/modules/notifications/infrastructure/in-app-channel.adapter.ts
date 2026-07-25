import { logger } from "@/shared/observability";
import type { NotificationChannelAdapter, NotificationRecord } from "../application/ports";

export class InAppChannelAdapter implements NotificationChannelAdapter {
  async send(record: NotificationRecord): Promise<void> {
    logger.info("notifications.inApp.created", {
      notificationId: record.id,
      userId: record.userId,
      type: record.type,
    });
  }
}
