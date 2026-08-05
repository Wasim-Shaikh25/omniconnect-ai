import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import type {
  NewMessagePayload,
  ConversationTakenOverPayload,
  AIResumedPayload,
} from "@/modules/conversations";
import type {
  FirstTimeFollowerDetectedPayload,
} from "@/modules/crm";
import type {
  CouponGeneratedPayload,
  AbandonedCartDetectedPayload,
} from "@/modules/ecommerce";
import type { EscalationRequestedPayload } from "@/modules/ai/events";
import { notificationService } from "./container";
import type { NotificationService } from "../application/ports";

function notify(projectId: string, type: Parameters<NotificationService["notify"]>[0]["type"], title: string, body: string, payload?: unknown, dedupKey?: string) {
  return notificationService.notify({ projectId, type, title, body, payload, dedupKey });
}

const onNewMessage: EventHandler = async (event) => {
  const p = event.payload as NewMessagePayload;
  await notify(
    p.projectId,
    "NEW_MESSAGE",
    `New ${p.channel} message`,
    p.content.length > 80 ? `${p.content.slice(0, 80)}…` : p.content,
    { conversationId: p.conversationId, externalUserId: p.externalUserId },
  );
};

const onFirstTimeFollower: EventHandler = async (event) => {
  const p = event.payload as FirstTimeFollowerDetectedPayload;
  const username = p.username ?? p.externalUserId;
  await notify(
    p.projectId,
    "NEW_FOLLOWER",
    "New follower",
    username ? `${username} followed you on ${p.channel}.` : "A new user followed you.",
    { followerId: p.followerId, externalUserId: p.externalUserId },
  );
};

const onCouponGenerated: EventHandler = async (event) => {
  const p = event.payload as CouponGeneratedPayload;
  await notify(
    p.projectId,
    "COUPON_GENERATED",
    "Coupon generated",
    `Code ${p.code} (${p.discountPct}% off) was created.`,
    { couponId: p.couponId, code: p.code },
  );
};

const onEscalationRequested: EventHandler = async (event) => {
  const p = event.payload as EscalationRequestedPayload;
  await notify(
    p.projectId,
    "ESCALATION",
    "Escalation requested",
    `Conversation ${p.conversationId} needs a human agent: ${p.reason}`,
    { conversationId: p.conversationId, externalUserId: p.externalUserId },
  );
};

const onConversationTakenOver: EventHandler = async (event) => {
  const p = event.payload as ConversationTakenOverPayload;
  await notify(
    p.projectId,
    "CONVERSATION_TAKEN_OVER",
    "Conversation taken over",
    `Conversation ${p.conversationId} is now under human control.`,
    { conversationId: p.conversationId, humanUserId: p.humanUserId },
  );
};

const onAIResumed: EventHandler = async (event) => {
  const p = event.payload as AIResumedPayload;
  await notify(
    p.projectId,
    "AI_RESUMED",
    "AI resumed",
    `Conversation ${p.conversationId} is back under AI control.`,
    { conversationId: p.conversationId },
  );
};

const onAbandonedCartDetected: EventHandler = async (event) => {
  const p = event.payload as AbandonedCartDetectedPayload;
  const summary = p.lineItemTitles.slice(0, 3).join(", ");
  const suffix = p.lineItemTitles.length > 3 ? " and more" : "";
  await notify(
    p.projectId,
    "ABANDONED_CART",
    "Abandoned cart recovered",
    `A cart was abandoned (${summary}${suffix}). Total: ${p.totalPrice ?? "unknown"} ${p.currency ?? ""}`,
    { cartId: p.cartId, cartToken: p.cartToken },
    `abandoned-cart:${p.cartId}`,
  );
};

export function registerNotificationsSubscribers(
  bus: EventBus = eventBus,
): void {
  bus.subscribe("NewMessage", onNewMessage);
  bus.subscribe("FirstTimeFollowerDetected", onFirstTimeFollower);
  bus.subscribe("CouponGenerated", onCouponGenerated);
  bus.subscribe("EscalationRequested", onEscalationRequested);
  bus.subscribe("ConversationTakenOver", onConversationTakenOver);
  bus.subscribe("AIResumed", onAIResumed);
  bus.subscribe("AbandonedCartDetected", onAbandonedCartDetected);
}
