import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import type { CustomerConsent } from "@/modules/crm";
import type { MetaService } from "@/modules/meta";
import type {
  AmbassadorRepository,
  BackInStockRepository,
  CommentUnlockRepository,
  DmCampaignRepository,
  GrowthService,
  ReferralOrderRepository,
  UgcRepository,
} from "./ports";
import {
  UgcAssetCollected,
  UgcRightsApproved,
  UgcRightsRequested,
  AmbassadorEnrolled,
  ReferralConverted,
  DmCampaignCreated,
  DmCampaignSent,
  BackInStockSubscribed,
  BackInStockAlertSent,
  CommentUnlockTriggered,
  CommentUnlockSent,
} from "../domain/events";

function generateCode(handle: string | null): string {
  const base = (handle ?? "amb").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const suffix = 1000 + (array[0] % 9000);
  return `${base}${suffix}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface GrowthServiceDeps {
  ugc: UgcRepository;
  ambassadors: AmbassadorRepository;
  referrals: ReferralOrderRepository;
  campaigns: DmCampaignRepository;
  backInStock: BackInStockRepository;
  commentUnlocks: CommentUnlockRepository;
  meta: MetaService;
  getCustomerConsent: (input: {
    projectId: string;
    externalUserId: string;
    channel: "INSTAGRAM" | "FACEBOOK";
  }) => Promise<CustomerConsent | null>;
}

export function makeGrowthService(deps: GrowthServiceDeps): GrowthService {
  return {
    async collectUgc(input) {
      const asset = await deps.ugc.create({
        projectId: input.projectId,
        creatorHandle: input.creatorHandle,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
        source: input.source,
        caption: input.caption,
      });
      await eventBus.publish(
        new UgcAssetCollected(input.projectId, {
          projectId: input.projectId,
          assetId: asset.id,
          creatorHandle: asset.creatorHandle,
          source: asset.source,
          mediaUrl: asset.mediaUrl,
        }),
      );
      return asset;
    },

    async requestRights(id, projectId) {
      const asset = await deps.ugc.updateRights(id, projectId, "REQUESTED", null);
      await eventBus.publish(
        new UgcRightsRequested(projectId, {
          projectId,
          assetId: asset.id,
          creatorHandle: asset.creatorHandle,
        }),
      );
      return asset;
    },

    async approveRights(id, projectId, approvedBy) {
      const asset = await deps.ugc.updateRights(id, projectId, "APPROVED", approvedBy);
      await eventBus.publish(
        new UgcRightsApproved(projectId, {
          projectId,
          assetId: asset.id,
          approvedBy,
        }),
      );
      return asset;
    },

    async enrollAmbassador(input) {
      const code = generateCode(input.handle ?? null);
      const ambassador = await deps.ambassadors.create({
        projectId: input.projectId,
        customerId: input.customerId ?? null,
        code,
        discountPct: input.discountPct ?? 10,
        commissionPct: input.commissionPct ?? 5,
        status: "ACTIVE",
      });
      await eventBus.publish(
        new AmbassadorEnrolled(input.projectId, {
          projectId: input.projectId,
          ambassadorId: ambassador.id,
          code: ambassador.code,
          discountPct: ambassador.discountPct,
          commissionPct: ambassador.commissionPct,
        }),
      );
      return ambassador;
    },

    async recordReferral(input) {
      const ambassador = await deps.ambassadors.findById(input.ambassadorId, input.projectId);
      if (!ambassador) throw new Error("Ambassador not found");
      if (ambassador.projectId !== input.projectId) throw new Error("Ambassador does not belong to this store");
      const commissionAmount =
        (Number(input.orderAmount) * ambassador.commissionPct) / 100;
      const order = await deps.referrals.create({
        projectId: input.projectId,
        ambassadorId: input.ambassadorId,
        orderId: input.orderId,
        orderAmount: Number(input.orderAmount),
        commissionAmount,
      });
      await deps.ambassadors.incrementEarnings(
        input.ambassadorId,
        input.projectId,
        commissionAmount,
        1,
      );
      await eventBus.publish(
        new ReferralConverted(input.projectId, {
          projectId: input.projectId,
          ambassadorId: input.ambassadorId,
          referralOrderId: order.id,
          orderId: input.orderId,
          orderAmount: Number(input.orderAmount),
          commissionAmount,
        }),
      );
      return order;
    },

    async createDmCampaign(input) {
      const campaign = await deps.campaigns.create({
        projectId: input.projectId,
        campaignType: input.campaignType,
        audienceCriteria: input.audienceCriteria,
        scheduledAt: input.scheduledAt,
      });
      await eventBus.publish(
        new DmCampaignCreated(input.projectId, {
          projectId: input.projectId,
          campaignId: campaign.id,
          campaignType: campaign.campaignType,
          status: campaign.status,
        }),
      );
      return campaign;
    },

    async sendDmCampaign(id, projectId) {
      const campaign = await deps.campaigns.markSent(id, projectId, { sentCount: 1 });
      await eventBus.publish(
        new DmCampaignSent(projectId, {
          projectId,
          campaignId: id,
          sentAt: new Date().toISOString(),
        }),
      );
      return campaign;
    },

    async subscribeBackInStock(input) {
      const subscription = await deps.backInStock.create({
        projectId: input.projectId,
        productId: input.productId,
        externalUserId: input.externalUserId,
        customerId: input.customerId,
      });
      await eventBus.publish(
        new BackInStockSubscribed(input.projectId, {
          projectId: input.projectId,
          subscriptionId: subscription.id,
          productId: subscription.productId,
          externalUserId: subscription.externalUserId,
        }),
      );
      return subscription;
    },

    async notifyBackInStock(id, projectId) {
      const subscription = await deps.backInStock.markNotified(id, projectId);
      await eventBus.publish(
        new BackInStockAlertSent(projectId, {
          projectId,
          subscriptionId: subscription.id,
          productId: subscription.productId,
          externalUserId: subscription.externalUserId,
        }),
      );
      return subscription;
    },

    async createCommentUnlockCampaign(input) {
      return deps.commentUnlocks.createCampaign({
        projectId: input.projectId,
        keyword: input.keyword,
        rewardType: input.rewardType,
        rewardValue: input.rewardValue,
        message: input.message,
        referralAsk: input.referralAsk,
      });
    },

    async processCommentUnlock(input) {
      const lowerText = input.text.toLowerCase();
      const campaigns = await deps.commentUnlocks.listCampaignsByStore(input.projectId);
      const campaign = campaigns.find((c) => {
        if (!c.active) return false;
        const keyword = c.keyword.toLowerCase().trim();
        const regex = new RegExp(`(?:^|[^\\w])${escapeRegExp(keyword)}(?:[^\\w]|$)`, "i");
        return regex.test(lowerText);
      });
      if (!campaign) return { sent: false };

      const existing = await deps.commentUnlocks.findExistingRedemption(
        campaign.id,
        input.externalUserId,
      );
      if (existing) return { sent: false, campaignId: campaign.id };

      const consent = await deps.getCustomerConsent({
        projectId: input.projectId,
        externalUserId: input.externalUserId,
        channel: input.channel,
      });
      if (consent === "DECLINED") {
        logger.info("growth.processCommentUnlock.consentDeclined", {
          projectId: input.projectId,
          externalUserId: input.externalUserId,
          campaignId: campaign.id,
        });
        return { sent: false, campaignId: campaign.id };
      }

      const redemption = await deps.commentUnlocks.createRedemption({
        campaignId: campaign.id,
        projectId: input.projectId,
        externalUserId: input.externalUserId,
        username: input.username,
        commentId: input.commentId,
      });

      await eventBus.publish(
        new CommentUnlockTriggered(input.projectId, {
          projectId: input.projectId,
          campaignId: campaign.id,
          redemptionId: redemption.id,
          externalUserId: input.externalUserId,
          keyword: campaign.keyword,
        }),
      );

      const rewardText = campaign.rewardValue
        ? `\n\nReward: ${campaign.rewardValue}`
        : "";
      const referralText = campaign.referralAsk
        ? `\n\n${campaign.referralAsk}`
        : "";
      const dm = `${campaign.message}${rewardText}${referralText}`;

      try {
        await deps.meta.sendMessage({
          projectId: input.projectId,
          recipientId: input.externalUserId,
          text: dm,
        });
        await deps.commentUnlocks.markSent(redemption.id, input.projectId);
        await eventBus.publish(
          new CommentUnlockSent(input.projectId, {
            projectId: input.projectId,
            campaignId: campaign.id,
            redemptionId: redemption.id,
            externalUserId: input.externalUserId,
          }),
        );
        return { sent: true, campaignId: campaign.id };
      } catch {
        return { sent: false, campaignId: campaign.id };
      }
    },
  };
}
