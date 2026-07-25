import type { NotificationQueries, NotificationRecord, NotificationRepository } from "./ports";

export function makeNotificationQueries(deps: {
  notifications: NotificationRepository;
}): NotificationQueries {
  return {
    listForUser(userId: string, limit = 50): Promise<NotificationRecord[]> {
      return deps.notifications.listByUser(userId, limit);
    },
    getUnreadCount(userId: string): Promise<number> {
      return deps.notifications.countUnreadByUser(userId);
    },
    markAsRead(userId: string, notificationId: string): Promise<void> {
      return deps.notifications.markAsRead(notificationId, userId);
    },
  };
}
