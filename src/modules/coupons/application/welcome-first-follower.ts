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
import { aiUsageGuard } from "@/modules/ai";
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
    projectId: string;
    externalUserId: string;
    channel: "INSTAGRAM" | "FACEBOOK";
  }) => Promise<CustomerConsent | null>;
  organizationQueries: {
    getOrganizationIdByStoreId(projectId: string): Promise<string | null>;
  };
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
    projectId: string;
    followerId: string;
    customerId: string;
    externalUserId: string;
    username: string | null;
    channel: "INSTAGRAM" | "FACEBOOK";
  }): Promise<void> {
    const campaign = await deps.campaigns.getOrCreateDefault(
      input.projectId,
      "FIRST_TIME_FOLLOWER",
    );

    if (!campaign.active) {
      logger.info("coupons.firstTimeFollower.disabled", {
        projectId: input.projectId,
        followerId: input.followerId,
      });
      return;
    }

    const consent = await deps.getCustomerConsent({
      projectId: input.projectId,
      externalUserId: input.externalUserId,
      channel: input.channel,
    });
    if (consent === "DECLINED") {
      logger.info("coupons.firstTimeFollower.consentDeclined", {
        projectId: input.projectId,
        followerId: input.followerId,
        externalUserId: input.externalUserId,
      });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + campaign.couponTtlDays);

    const code = sanitizeUsername(input.username);

    const couponResult = await deps.generateCoupon({
      projectId: input.projectId,
      code,
      discountPct: campaign.discountPct,
      expiresAt,
      customerId: input.customerId,
      pushToProvider: false,
    });

    if (!couponResult.ok) {
      logger.error("coupons.firstTimeFollower.couponFailed", {
        projectId: input.projectId,
        error: couponResult.error.message,
      });
      return;
    }

    const coupon = couponResult.value;

    await eventBus.publish(
      new WelcomeCouponGenerated(input.projectId, {
        projectId: input.projectId,
        followerId: input.followerId,
        customerId: input.customerId,
        externalUserId: input.externalUserId,
        couponId: coupon.id,
        code: coupon.code,
        discountPct: coupon.discountPct,
        expiresAt,
      }),
    );

    const userId = await deps.organizationQueries.getOrganizationIdByStoreId(
      input.projectId,
    );
    if (userId) {
      try {
        await aiUsageGuard.assertAvailable(userId);
      } catch {
        logger.warn("coupons.firstTimeFollower.aiQuotaExceeded", { projectId: input.projectId });
        return;
      }
    }

    const messageText = await deps.generateWelcome(input.projectId, {
      username: input.username,
      couponCode: coupon.code,
      discountPct: coupon.discountPct,
      messageTemplate: campaign.messageTemplate,
      toneOverride: null,
    });

    try {
      await deps.metaService.sendMessage({
        projectId: input.projectId,
        recipientId: input.externalUserId,
        text: messageText,
      });
    } catch (error) {
      logger.error("coupons.firstTimeFollower.sendFailed", {
        projectId: input.projectId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await deps.crmCommands.recordFollowerCampaignEnrollment({
      followerId: input.followerId,
      projectId: input.projectId,
      couponId: coupon.id,
      welcomeMessageText: messageText,
    });

    const conversation = await deps.conversationCommands.createConversation({
      projectId: input.projectId,
      channel: input.channel,
      externalId: input.externalUserId,
      customerId: input.customerId,
    });

    await deps.conversationCommands.appendMessage(
      conversation.id,
      input.projectId,
      "AI",
      messageText,
    );

    await eventBus.publish(
      new WelcomeMessageSent(input.projectId, {
        projectId: input.projectId,
        followerId: input.followerId,
        customerId: input.customerId,
        externalUserId: input.externalUserId,
        couponId: coupon.id,
        messageText,
      }),
    );

    logger.info("coupons.firstTimeFollower.enrolled", {
      projectId: input.projectId,
      followerId: input.followerId,
      couponId: coupon.id,
    });
  };
}

export type WelcomeFirstFollower = ReturnType<typeof makeWelcomeFirstFollower>;
