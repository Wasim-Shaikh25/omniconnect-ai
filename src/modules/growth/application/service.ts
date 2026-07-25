import { eventBus } from "@/shared/events";
import type {
  AmbassadorRepository,
  BackInStockRepository,
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
} from "../domain/events";

function generateCode(handle: string | null): string {
  const base = (handle ?? "amb").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}_${suffix}`;
}

export interface GrowthServiceDeps {
  ugc: UgcRepository;
  ambassadors: AmbassadorRepository;
  referrals: ReferralOrderRepository;
  campaigns: DmCampaignRepository;
  backInStock: BackInStockRepository;
}

export function makeGrowthService(deps: GrowthServiceDeps): GrowthService {
  return {
    async collectUgc(input) {
      const asset = await deps.ugc.create({
        storeId: input.storeId,
        creatorHandle: input.creatorHandle,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
        source: input.source,
        caption: input.caption,
      });
      await eventBus.publish(
        new UgcAssetCollected(input.storeId, {
          storeId: input.storeId,
          assetId: asset.id,
          creatorHandle: asset.creatorHandle,
          source: asset.source,
          mediaUrl: asset.mediaUrl,
        }),
      );
      return asset;
    },

    async requestRights(id, storeId) {
      const asset = await deps.ugc.updateRights(id, "REQUESTED", null);
      await eventBus.publish(
        new UgcRightsRequested(storeId, {
          storeId,
          assetId: asset.id,
          creatorHandle: asset.creatorHandle,
        }),
      );
      return asset;
    },

    async approveRights(id, storeId, approvedBy) {
      const asset = await deps.ugc.updateRights(id, "APPROVED", approvedBy);
      await eventBus.publish(
        new UgcRightsApproved(storeId, {
          storeId,
          assetId: asset.id,
          approvedBy,
        }),
      );
      return asset;
    },

    async enrollAmbassador(input) {
      const code = generateCode(input.handle ?? null);
      const ambassador = await deps.ambassadors.create({
        storeId: input.storeId,
        customerId: input.customerId ?? null,
        code,
        discountPct: input.discountPct ?? 10,
        commissionPct: input.commissionPct ?? 5,
        status: "ACTIVE",
      });
      await eventBus.publish(
        new AmbassadorEnrolled(input.storeId, {
          storeId: input.storeId,
          ambassadorId: ambassador.id,
          code: ambassador.code,
          discountPct: ambassador.discountPct,
          commissionPct: ambassador.commissionPct,
        }),
      );
      return ambassador;
    },

    async recordReferral(input) {
      const ambassador = await deps.ambassadors.findById(input.ambassadorId);
      if (!ambassador) throw new Error("Ambassador not found");
      const commissionAmount =
        (Number(input.orderAmount) * ambassador.commissionPct) / 100;
      const order = await deps.referrals.create({
        storeId: input.storeId,
        ambassadorId: input.ambassadorId,
        orderId: input.orderId,
        orderAmount: Number(input.orderAmount),
        commissionAmount,
      });
      await deps.ambassadors.incrementEarnings(
        input.ambassadorId,
        commissionAmount,
        1,
      );
      await eventBus.publish(
        new ReferralConverted(input.storeId, {
          storeId: input.storeId,
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
        storeId: input.storeId,
        campaignType: input.campaignType,
        audienceCriteria: input.audienceCriteria,
        scheduledAt: input.scheduledAt,
      });
      await eventBus.publish(
        new DmCampaignCreated(input.storeId, {
          storeId: input.storeId,
          campaignId: campaign.id,
          campaignType: campaign.campaignType,
          status: campaign.status,
        }),
      );
      return campaign;
    },

    async sendDmCampaign(id, storeId) {
      const campaign = await deps.campaigns.markSent(id, { sentCount: 1 });
      await eventBus.publish(
        new DmCampaignSent(storeId, {
          storeId,
          campaignId: id,
          sentAt: new Date().toISOString(),
        }),
      );
      return campaign;
    },

    async subscribeBackInStock(input) {
      const subscription = await deps.backInStock.create({
        storeId: input.storeId,
        productId: input.productId,
        externalUserId: input.externalUserId,
        customerId: input.customerId,
      });
      await eventBus.publish(
        new BackInStockSubscribed(input.storeId, {
          storeId: input.storeId,
          subscriptionId: subscription.id,
          productId: subscription.productId,
          externalUserId: subscription.externalUserId,
        }),
      );
      return subscription;
    },

    async notifyBackInStock(id, storeId) {
      const subscription = await deps.backInStock.markNotified(id);
      await eventBus.publish(
        new BackInStockAlertSent(storeId, {
          storeId,
          subscriptionId: subscription.id,
          productId: subscription.productId,
          externalUserId: subscription.externalUserId,
        }),
      );
      return subscription;
    },
  };
}
