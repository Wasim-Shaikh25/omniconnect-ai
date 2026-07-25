import { logger } from "@/shared/observability";
import type {
  NotificationChannel,
  NotificationChannelAdapter,
  NotificationRepository,
  NotificationService,
  OrganizationMembersResolver,
} from "./ports";

export function makeNotificationService(deps: {
  notifications: NotificationRepository;
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

      for (const userId of userIds) {
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
