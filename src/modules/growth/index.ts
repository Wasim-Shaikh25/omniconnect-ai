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
} from "./application/ports";

export { growthService, growthQueries } from "./infrastructure/container";

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
