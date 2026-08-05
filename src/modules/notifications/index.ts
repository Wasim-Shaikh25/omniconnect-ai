/**
 * Notifications module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/notifications`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: In-app + email notifications across events.
 * Public contract: Notifier (notify); channel adapters (in-app, email); subscribes to cross-module events.
 */
export const MODULE_NAME = "notifications" as const;

// Application types
export type {
  NotificationRecord,
  NotificationQueries,
  NotificationService,
  NotificationPreferenceRecord,
} from "./application/ports";
export type { NotificationServiceImpl } from "./application/service";
export type { SmsSender } from "./domain/sms-sender";

// Composed service + queries
export {
  notificationService,
  notificationQueries,
  notificationPreferences,
  smsSender,
} from "./infrastructure/container";

// Presentation
export {
  listNotificationsAction,
  getUnreadNotificationCountAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  getNotificationPreferencesAction,
  updateNotificationPreferenceAction,
} from "./presentation/actions";
