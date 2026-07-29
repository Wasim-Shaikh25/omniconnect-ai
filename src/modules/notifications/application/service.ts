import { logger } from "@/shared/observability";
import type {
  NotificationChannel,
  NotificationChannelAdapter,
  NotificationPreferenceRepository,
  NotificationRepository,
  NotificationService,
  OrganizationMembersResolver,
} from "./ports";

export function makeNotificationService(deps: {
  notifications: NotificationRepository;
  preferences: NotificationPreferenceRepository;
  members: OrganizationMembersResolver;
  channels: Record<NotificationChannel, NotificationChannelAdapter>;
}) {
  return {
    async notify(input: {
      storeId: string;
      type: Parameters<NotificationService["notify"]>[0]["type"];
      title: string;
      body: string;
      payload?: unknown;
      channel?: NotificationChannel;
      tier?: Parameters<NotificationService["notify"]>[0]["tier"];
      dedupKey?: string;
    }): Promise<void> {
      const userIds = await deps.members.getUserIdsForStore(input.storeId);
      if (userIds.length === 0) {
        logger.warn("notifications.notify.noUsers", { storeId: input.storeId });
        return;
      }

      const channel = input.channel ?? "IN_APP";
      const adapter = deps.channels[channel];

      async function isEnabled(userId: string, eventType: string, ch: string): Promise<boolean> {
        const prefs = await deps.preferences.listForUser(userId);
        const key = `${ch}:${eventType}`;
        const stored = prefs.find((p) => `${p.channel}:${p.eventType}` === key)?.enabled;
        if (stored !== undefined) return stored;
        // Defaults: IN_APP on, EMAIL off unless explicitly enabled.
        return ch === "IN_APP";
      }

      for (const userId of userIds) {
        if (!(await isEnabled(userId, input.type, channel))) continue;

        const record = await deps.notifications.create({
          userId,
          storeId: input.storeId,
          type: input.type,
          channel,
          tier: input.tier,
          title: input.title,
          body: input.body,
          payload: input.payload,
          dedupKey: input.dedupKey,
        });

        try {
          await adapter.send(record);
        } catch (error) {
          logger.error("notifications.channel.sendFailed", {
            channel,
            notificationId: record.id,
            error: error instanceof Error ? error.message : "unknown",
          });
        }
      }
    },
  };
}

export type NotificationServiceImpl = ReturnType<typeof makeNotificationService>;
