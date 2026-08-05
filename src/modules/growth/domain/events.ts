import { BaseDomainEvent } from "@/shared/kernel";

export interface UgcAssetCollectedPayload {
  projectId: string;
  assetId: string;
  creatorHandle: string | null;
  source: string;
  mediaUrl: string | null;
}

export class UgcAssetCollected extends BaseDomainEvent<UgcAssetCollectedPayload> {
  readonly name = "UgcAssetCollected";
}

export interface UgcRightsRequestedPayload {
  projectId: string;
  assetId: string;
  creatorHandle: string | null;
}

export class UgcRightsRequested extends BaseDomainEvent<UgcRightsRequestedPayload> {
  readonly name = "UgcRightsRequested";
}

export interface UgcRightsApprovedPayload {
  projectId: string;
  assetId: string;
  approvedBy: string;
}

export class UgcRightsApproved extends BaseDomainEvent<UgcRightsApprovedPayload> {
  readonly name = "UgcRightsApproved";
}

export interface AmbassadorEnrolledPayload {
  projectId: string;
  ambassadorId: string;
  code: string;
  discountPct: number;
  commissionPct: number;
}

export class AmbassadorEnrolled extends BaseDomainEvent<AmbassadorEnrolledPayload> {
  readonly name = "AmbassadorEnrolled";
}

export interface ReferralConvertedPayload {
  projectId: string;
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
  projectId: string;
  campaignId: string;
  campaignType: string;
  status: string;
}

export class DmCampaignCreated extends BaseDomainEvent<DmCampaignCreatedPayload> {
  readonly name = "DmCampaignCreated";
}

export interface DmCampaignSentPayload {
  projectId: string;
  campaignId: string;
  sentAt: string;
}

export class DmCampaignSent extends BaseDomainEvent<DmCampaignSentPayload> {
  readonly name = "DmCampaignSent";
}

export interface BackInStockSubscribedPayload {
  projectId: string;
  subscriptionId: string;
  productId: string;
  externalUserId: string | null;
}

export class BackInStockSubscribed extends BaseDomainEvent<BackInStockSubscribedPayload> {
  readonly name = "BackInStockSubscribed";
}

export interface BackInStockAlertSentPayload {
  projectId: string;
  subscriptionId: string;
  productId: string;
  externalUserId: string | null;
}

export class BackInStockAlertSent extends BaseDomainEvent<BackInStockAlertSentPayload> {
  readonly name = "BackInStockAlertSent";
}

export interface CommentUnlockTriggeredPayload {
  projectId: string;
  campaignId: string;
  redemptionId: string;
  externalUserId: string;
  keyword: string;
}

export class CommentUnlockTriggered extends BaseDomainEvent<CommentUnlockTriggeredPayload> {
  readonly name = "CommentUnlockTriggered";
}

export interface CommentUnlockSentPayload {
  projectId: string;
  campaignId: string;
  redemptionId: string;
  externalUserId: string;
}

export class CommentUnlockSent extends BaseDomainEvent<CommentUnlockSentPayload> {
  readonly name = "CommentUnlockSent";
}

export interface GrowthInsight {
  userId: string;
  projectId: string;
  type: "RISK" | "OPPORTUNITY" | "ANOMALY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "DISMISSED" | "SNOOZED";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface GrowthRecommendation {
  userId: string;
  projectId: string;
  type: "ACTION" | "INVESTIGATE" | "WAIT";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  deepLink: string;
  generatedAt: Date;
}

export interface GrowthInsightGeneratedPayload {
  userId: string;
  projectId: string;
  insight: GrowthInsight;
}

export class GrowthInsightGenerated extends BaseDomainEvent<GrowthInsightGeneratedPayload> {
  readonly name = "GrowthInsightGenerated";
}

export interface GrowthRecommendationGeneratedPayload {
  userId: string;
  projectId: string;
  recommendation: GrowthRecommendation;
}

export class GrowthRecommendationGenerated extends BaseDomainEvent<GrowthRecommendationGeneratedPayload> {
  readonly name = "GrowthRecommendationGenerated";
}
