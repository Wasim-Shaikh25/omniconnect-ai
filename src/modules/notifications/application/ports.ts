import type { NotificationType, NotificationChannel, NotificationDeliveryTier } from "@prisma/client";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";

export type { NotificationType, NotificationChannel, NotificationDeliveryTier };
export type { PaginationInput, PaginatedResult };

export interface NotificationRecord {
  id: string;
  userId: string;
  storeId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  tier: NotificationDeliveryTier;
  title: string;
  body: string;
  payload: unknown | null;
  dedupKey: string | null;
  read: boolean;
  createdAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  storeId?: string;
  type: NotificationType;
  channel?: NotificationChannel;
  tier?: NotificationDeliveryTier;
  title: string;
  body: string;
  payload?: unknown;
  dedupKey?: string;
}

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<NotificationRecord>;
  listByUser(
    userId: string,
    options?: { limit?: number; offset?: number; search?: string },
  ): Promise<NotificationRecord[]>;
  countByUser(userId: string, search?: string): Promise<number>;
  findRecentByDedupKey(dedupKey: string, since: Date): Promise<NotificationRecord[]>;
  countUnreadByUser(userId: string): Promise<number>;
  markAsRead(id: string, userId: string): Promise<void>;
  markAllReadByUser(userId: string): Promise<number>;
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
    tier?: NotificationDeliveryTier;
    dedupKey?: string;
  }): Promise<void>;
}

export interface NotificationQueries {
  listForUser(userId: string, limitOrOptions?: number | { limit?: number; offset?: number; search?: string }): Promise<NotificationRecord[]>;
  listForUserPaginated(userId: string, pagination: PaginationInput, search?: string): Promise<PaginatedResult<NotificationRecord>>;
  countForUser(userId: string, search?: string): Promise<number>;
  getUnreadCount(userId: string): Promise<number>;
  markAsRead(userId: string, notificationId: string): Promise<void>;
  markAllRead(userId: string): Promise<number>;
  findRecentByDedupKey(dedupKey: string, since: Date): Promise<NotificationRecord[]>;
}

export interface NotificationPreferenceRecord {
  id: string;
  userId: string;
  channel: string;
  eventType: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferenceRepository {
  listForUser(userId: string): Promise<NotificationPreferenceRecord[]>;
  upsert(input: {
    userId: string;
    channel: string;
    eventType: string;
    enabled: boolean;
  }): Promise<NotificationPreferenceRecord>;
}
