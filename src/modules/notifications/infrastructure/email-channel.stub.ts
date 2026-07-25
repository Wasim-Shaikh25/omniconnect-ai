import { logger } from "@/shared/observability";
import type { NotificationChannelAdapter, NotificationRecord } from "../application/ports";

export class EmailChannelStub implements NotificationChannelAdapter {
  async send(record: NotificationRecord): Promise<void> {
    logger.info("notifications.email.stub", {
      notificationId: record.id,
      userId: record.userId,
      title: record.title,
    });
  }
}
