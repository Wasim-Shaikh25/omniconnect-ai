import type {
  ConnectorError,
  CouponRecord,
  GenerateCouponInput,
  StoreNotConnectedError,
} from "@/modules/ecommerce";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability/logger";
import { randomAlphanumeric } from "@/shared/security/random";
import type { Result } from "@/shared/kernel";
import type { GenerateWelcome } from "@/modules/ai";
import type { CrmCommands, CustomerConsent } from "@/modules/crm";
import type { ConversationCommands } from "@/modules/conversations";
import type { MetaService } from "@/modules/meta";
import {
  WelcomeCouponGenerated,
  WelcomeMessageSent,
} from "../domain/events";
import type { CampaignRepository } from "./ports";

type GenerateCoupon = (
  input: GenerateCouponInput,
) => Promise<Result<CouponRecord, StoreNotConnectedError | ConnectorError>>;

export interface WelcomeFirstFollowerDeps {
  campaigns: CampaignRepository;
  generateCoupon: GenerateCoupon;
  generateWelcome: GenerateWelcome;
  metaService: MetaService;
  crmCommands: CrmCommands;
  conversationCommands: ConversationCommands;
  getCustomerConsent: (input: {
    storeId: string;
    externalUserId: string;
    channel: "INSTAGRAM" | "FACEBOOK";
  }) => Promise<CustomerConsent | null>;
}

function sanitizeUsername(username: string | null): string {
  const base = (username ?? "WELCOME").toUpperCase();
  const cleaned = base.replace(/[^A-Z0-9_-]/g, "").slice(0, 20);
  if (cleaned.length >= 3) return cleaned;
  const suffix = randomAlphanumeric(4);
  return `WELCOME${suffix}`;
}

export function makeWelcomeFirstFollower(deps: WelcomeFirstFollowerDeps) {
  return async function welcomeFirstFollower(input: {
    storeId: string;
    followerId: string;
    customerId: string;
    externalUserId: string;
    username: string | null;
    channel: "INSTAGRAM" | "FACEBOOK";
  }): Promise<void> {
    const campaign = await deps.campaigns.getOrCreateDefault(
      input.storeId,
      "FIRST_TIME_FOLLOWER",
    );

    if (!campaign.active) {
      logger.info("coupons.firstTimeFollower.disabled", {
        storeId: input.storeId,
        followerId: input.followerId,
      });
      return;
    }

    const consent = await deps.getCustomerConsent({
      storeId: input.storeId,
      externalUserId: input.externalUserId,
      channel: input.channel,
    });
    if (consent === "DECLINED") {
      logger.info("coupons.firstTimeFollower.consentDeclined", {
        storeId: input.storeId,
        followerId: input.followerId,
        externalUserId: input.externalUserId,
      });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + campaign.couponTtlDays);

    const code = sanitizeUsername(input.username);

    const couponResult = await deps.generateCoupon({
      storeId: input.storeId,
      code,
      discountPct: campaign.discountPct,
      expiresAt,
      customerId: input.customerId,
      pushToProvider: false,
    });

    if (!couponResult.ok) {
      logger.error("coupons.firstTimeFollower.couponFailed", {
        storeId: input.storeId,
        error: couponResult.error.message,
      });
      return;
    }

    const coupon = couponResult.value;

    await eventBus.publish(
      new WelcomeCouponGenerated(input.storeId, {
        storeId: input.storeId,
        followerId: input.followerId,
        customerId: input.customerId,
        externalUserId: input.externalUserId,
        couponId: coupon.id,
        code: coupon.code,
        discountPct: coupon.discountPct,
        expiresAt,
      }),
    );

    const messageText = await deps.generateWelcome(input.storeId, {
      username: input.username,
      couponCode: coupon.code,
      discountPct: coupon.discountPct,
      messageTemplate: campaign.messageTemplate,
      toneOverride: null,
    });

    try {
      await deps.metaService.sendMessage({
        storeId: input.storeId,
        recipientId: input.externalUserId,
        text: messageText,
      });
    } catch (error) {
      logger.error("coupons.firstTimeFollower.sendFailed", {
        storeId: input.storeId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await deps.crmCommands.recordFollowerCampaignEnrollment({
      followerId: input.followerId,
      storeId: input.storeId,
      couponId: coupon.id,
      welcomeMessageText: messageText,
    });

    const conversation = await deps.conversationCommands.createConversation({
      storeId: input.storeId,
      channel: input.channel,
      externalId: input.externalUserId,
      customerId: input.customerId,
    });

    await deps.conversationCommands.appendMessage(
      conversation.id,
      input.storeId,
      "AI",
      messageText,
    );

    await eventBus.publish(
      new WelcomeMessageSent(input.storeId, {
        storeId: input.storeId,
        followerId: input.followerId,
        customerId: input.customerId,
        externalUserId: input.externalUserId,
        couponId: coupon.id,
        messageText,
      }),
    );

    logger.info("coupons.firstTimeFollower.enrolled", {
      storeId: input.storeId,
      followerId: input.followerId,
      couponId: coupon.id,
    });
  };
}

export type WelcomeFirstFollower = ReturnType<typeof makeWelcomeFirstFollower>;
