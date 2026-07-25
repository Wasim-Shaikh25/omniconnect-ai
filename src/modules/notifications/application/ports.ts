import type { NotificationType, NotificationChannel } from "@prisma/client";

export type { NotificationType, NotificationChannel };

export interface NotificationRecord {
  id: string;
  userId: string;
  storeId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  payload: unknown | null;
  read: boolean;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  storeId?: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  body: string;
  payload?: unknown;
}

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationRecord>;
  listByUser(
    userId: string,
    limit?: number,
  ): Promise<NotificationRecord[]>;
  countUnreadByUser(userId: string): Promise<number>;
  markAsRead(id: string, userId: string): Promise<void>;
}

export interface OrganizationMembersResolver {
  getUserIdsForStore(storeId: string): Promise<string[]>;
}

export interface NotificationChannelAdapter {
  send(record: NotificationRecord): Promise<void>;
}

export interface NotificationService {
  notify(input: {
    storeId: string;
    type: NotificationType;
    title: string;
    body: string;
    payload?: unknown;
  }): Promise<void>;
}

export interface NotificationQueries {
  listForUser(userId: string, limit?: number): Promise<NotificationRecord[]>;
  getUnreadCount(userId: string): Promise<number>;
  markAsRead(userId: string, notificationId: string): Promise<void>;
}
