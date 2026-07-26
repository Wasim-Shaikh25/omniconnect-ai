/**
 * Growth module — public barrel.
 *
 * Exports UGC, ambassador/referral, conversational commerce (DM campaign,
 * back-in-stock), and viral growth (comment-to-DM unlock) services and
 * actions. Other modules may only import from here.
 */
export const MODULE_NAME = "growth" as const;

export type {
  UgcAssetRecord,
  AmbassadorRecord,
  ReferralOrderRecord,
  DmCampaignRecord,
  BackInStockSubscriptionRecord,
  CommentUnlockCampaignRecord,
  CommentUnlockRedemptionRecord,
  GrowthQueries,
} from "./application/ports";

export { growthService, growthQueries, detectGrowthInsights } from "./infrastructure/container";
export type { ActionResult } from "./application/action-handlers";
export { executeGrowthAction } from "./application/action-handlers";

export {
  listGrowthAction,
  collectUgcAction,
  requestUgcRightsAction,
  approveUgcRightsAction,
  enrollAmbassadorAction,
  recordReferralAction,
  createDmCampaignAction,
  sendDmCampaignAction,
  subscribeBackInStockAction,
  notifyBackInStockAction,
  createCommentUnlockCampaignAction,
} from "./presentation/actions";

export type { GrowthActionState } from "./presentation/actions";

export type {
  UgcAssetCollectedPayload,
  AmbassadorEnrolledPayload,
  ReferralConvertedPayload,
  DmCampaignCreatedPayload,
  DmCampaignSentPayload,
  GrowthInsight,
  GrowthRecommendation,
  GrowthInsightGeneratedPayload,
  GrowthRecommendationGeneratedPayload,
} from "./domain/events";
export type { DetectGrowthInsights } from "./application/detect-insights";
