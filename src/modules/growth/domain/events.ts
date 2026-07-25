import { BaseDomainEvent } from "@/shared/kernel";

export interface UgcAssetCollectedPayload {
  storeId: string;
  assetId: string;
  creatorHandle: string | null;
  source: string;
  mediaUrl: string | null;
}

export class UgcAssetCollected extends BaseDomainEvent<UgcAssetCollectedPayload> {
  readonly name = "UgcAssetCollected";
}

export interface UgcRightsRequestedPayload {
  storeId: string;
  assetId: string;
  creatorHandle: string | null;
}

export class UgcRightsRequested extends BaseDomainEvent<UgcRightsRequestedPayload> {
  readonly name = "UgcRightsRequested";
}

export interface UgcRightsApprovedPayload {
  storeId: string;
  assetId: string;
  approvedBy: string;
}

export class UgcRightsApproved extends BaseDomainEvent<UgcRightsApprovedPayload> {
  readonly name = "UgcRightsApproved";
}

export interface AmbassadorEnrolledPayload {
  storeId: string;
  ambassadorId: string;
  code: string;
  discountPct: number;
  commissionPct: number;
}

export class AmbassadorEnrolled extends BaseDomainEvent<AmbassadorEnrolledPayload> {
  readonly name = "AmbassadorEnrolled";
}

export interface ReferralConvertedPayload {
  storeId: string;
  ambassadorId: string;
  referralOrderId: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
}

export class ReferralConverted extends BaseDomainEvent<ReferralConvertedPayload> {
  readonly name = "ReferralConverted";
}

export interface DmCampaignCreatedPayload {
  storeId: string;
  campaignId: string;
  campaignType: string;
  status: string;
}

export class DmCampaignCreated extends BaseDomainEvent<DmCampaignCreatedPayload> {
  readonly name = "DmCampaignCreated";
}

export interface DmCampaignSentPayload {
  storeId: string;
  campaignId: string;
  sentAt: string;
}

export class DmCampaignSent extends BaseDomainEvent<DmCampaignSentPayload> {
  readonly name = "DmCampaignSent";
}

export interface BackInStockSubscribedPayload {
  storeId: string;
  subscriptionId: string;
  productId: string;
  externalUserId: string | null;
}

export class BackInStockSubscribed extends BaseDomainEvent<BackInStockSubscribedPayload> {
  readonly name = "BackInStockSubscribed";
}

export interface BackInStockAlertSentPayload {
  storeId: string;
  subscriptionId: string;
  productId: string;
  externalUserId: string | null;
}

export class BackInStockAlertSent extends BaseDomainEvent<BackInStockAlertSentPayload> {
  readonly name = "BackInStockAlertSent";
}

export interface CommentUnlockTriggeredPayload {
  storeId: string;
  campaignId: string;
  redemptionId: string;
  externalUserId: string;
  keyword: string;
}

export class CommentUnlockTriggered extends BaseDomainEvent<CommentUnlockTriggeredPayload> {
  readonly name = "CommentUnlockTriggered";
}

export interface CommentUnlockSentPayload {
  storeId: string;
  campaignId: string;
  redemptionId: string;
  externalUserId: string;
}

export class CommentUnlockSent extends BaseDomainEvent<CommentUnlockSentPayload> {
  readonly name = "CommentUnlockSent";
}
