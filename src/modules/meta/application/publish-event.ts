import { eventBus } from "@/shared/events";
import {
  MetaCommentReceived,
  MetaFollowReceived,
  MetaMessageReceived,
} from "../domain/events";
import type { NormalizedMetaEvent } from "../domain/types";

/**
 * Publishes a normalized Meta event (already resolved to an owning store) onto
 * the shared bus. Consumers (crm, conversations) subscribe by event name — this
 * module never writes their tables.
 */
export async function publishMetaEvent(
  projectId: string,
  event: NormalizedMetaEvent,
): Promise<void> {
  switch (event.kind) {
    case "message":
      await eventBus.publish(
        new MetaMessageReceived(projectId, {
          projectId,
          channel: event.channel,
          externalUserId: event.externalUserId,
          username: event.username,
          text: event.text ?? "",
          externalConversationId: event.externalRef,
        }),
      );
      return;
    case "follow":
      await eventBus.publish(
        new MetaFollowReceived(projectId, {
          projectId,
          channel: event.channel,
          externalUserId: event.externalUserId,
          username: event.username,
        }),
      );
      return;
    case "comment":
      await eventBus.publish(
        new MetaCommentReceived(projectId, {
          projectId,
          channel: event.channel,
          externalUserId: event.externalUserId,
          username: event.username,
          text: event.text ?? "",
          postId: event.externalRef,
        }),
      );
      return;
  }
}
