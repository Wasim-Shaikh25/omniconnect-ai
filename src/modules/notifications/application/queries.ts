import type { NotificationQueries, NotificationRecord, NotificationRepository } from "./ports";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";
import { paginatedResult, toSkip } from "@/shared/kernel";

export function makeNotificationQueries(deps: {
  notifications: NotificationRepository;
}): NotificationQueries {
  return {
    listForUser(
      userId: string,
      limitOrOptions: number | { limit?: number; offset?: number; search?: string } = 50,
    ): Promise<NotificationRecord[]> {
      const options = typeof limitOrOptions === "number" ? { limit: limitOrOptions } : limitOrOptions;
      return deps.notifications.listByUser(userId, options);
    },

    async listForUserPaginated(
      userId: string,
      pagination: PaginationInput,
      search?: string,
    ): Promise<PaginatedResult<NotificationRecord>> {
      const [items, total] = await Promise.all([
        deps.notifications.listByUser(userId, { ...pagination, offset: toSkip(pagination), search }),
        deps.notifications.countByUser(userId, search),
      ]);
      return paginatedResult(items, total, pagination);
    },

    countForUser(userId: string, search?: string): Promise<number> {
      return deps.notifications.countByUser(userId, search);
    },

    getUnreadCount(userId: string): Promise<number> {
      return deps.notifications.countUnreadByUser(userId);
    },

    markAsRead(userId: string, notificationId: string): Promise<void> {
      return deps.notifications.markAsRead(notificationId, userId);
    },

    markAllRead(userId: string): Promise<number> {
      return deps.notifications.markAllReadByUser(userId);
    },

    findRecentByDedupKey(dedupKey: string, since: Date): Promise<NotificationRecord[]> {
      return deps.notifications.findRecentByDedupKey(dedupKey, since);
    },
  };
}
