/**
 * Growth module — public barrel.
 *
 * Exports UGC, ambassador/referral, and conversational commerce (DM campaign,
 * back-in-stock) services and actions. Other modules may only import from here.
 */
export const MODULE_NAME = "growth" as const;

export type {
  UgcAssetRecord,
  AmbassadorRecord,
  ReferralOrderRecord,
  DmCampaignRecord,
  BackInStockSubscriptionRecord,
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
} from "./presentation/actions";
