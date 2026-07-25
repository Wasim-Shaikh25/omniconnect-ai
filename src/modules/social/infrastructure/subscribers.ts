import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import type {
  MetaCommentReceivedPayload,
  MetaMessageReceivedPayload,
  MetaFollowReceivedPayload,
} from "@/modules/meta";
import { socialAutomationService, leadService } from "./container";

const onMetaCommentReceived: EventHandler = async (event) => {
  const p = event.payload as MetaCommentReceivedPayload;
  const comment = await socialAutomationService.handleComment({
    storeId: p.storeId,
    externalUserId: p.externalUserId,
    username: p.username,
    text: p.text,
    externalMediaId: p.postId,
  });

  if (comment.intent === "PURCHASE_INTENT" || comment.intent === "QUESTION") {
    await leadService.captureLead({
      storeId: p.storeId,
      source: "COMMENT",
      payload: {
        username: p.username,
        text: p.text,
        commentId: comment.id,
        intent: comment.intent,
      },
    });
  }
};

const onMetaMessageReceived: EventHandler = async (event) => {
  const p = event.payload as MetaMessageReceivedPayload;
  await leadService.captureLead({
    storeId: p.storeId,
    source: "DM",
    payload: {
      externalUserId: p.externalUserId,
      username: p.username,
      text: p.text,
    },
  });
};

const onMetaFollowReceived: EventHandler = async (event) => {
  const p = event.payload as MetaFollowReceivedPayload;
  await leadService.captureLead({
    storeId: p.storeId,
    source: "FOLLOW",
    payload: {
      externalUserId: p.externalUserId,
      username: p.username,
      channel: p.channel,
    },
  });
};

export function registerSocialSubscribers(bus: EventBus = eventBus): void {
  bus.subscribe("MetaCommentReceived", onMetaCommentReceived);
  bus.subscribe("MetaMessageReceived", onMetaMessageReceived);
  bus.subscribe("MetaFollowReceived", onMetaFollowReceived);
}
