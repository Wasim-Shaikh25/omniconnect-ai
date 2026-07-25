import type {
  AmbassadorRecord,
  BackInStockRepository,
  BackInStockSubscriptionRecord,
  CommentUnlockCampaignRecord,
  CommentUnlockRepository,
  DmCampaignRecord,
  DmCampaignRepository,
  ReferralOrderRecord,
  ReferralOrderRepository,
  UgcAssetRecord,
  UgcRepository,
  AmbassadorRepository,
} from "./ports";

import type { GrowthQueries } from "./ports";

export function makeGrowthQueries(deps: {
  ugc: UgcRepository;
  ambassadors: AmbassadorRepository;
  referrals: ReferralOrderRepository;
  campaigns: DmCampaignRepository;
  backInStock: BackInStockRepository;
  commentUnlocks: CommentUnlockRepository;
}): GrowthQueries {
  return {
    async listUgc(storeId: string, limit = 50): Promise<UgcAssetRecord[]> {
      return deps.ugc.listByStore(storeId, limit);
    },
    async listAmbassadors(storeId: string, limit = 50): Promise<AmbassadorRecord[]> {
      return deps.ambassadors.listByStore(storeId, limit);
    },
    async listReferrals(storeId: string, limit = 50): Promise<ReferralOrderRecord[]> {
      return deps.referrals.listByStore(storeId, limit);
    },
    async listCampaigns(storeId: string, limit = 50): Promise<DmCampaignRecord[]> {
      return deps.campaigns.listByStore(storeId, limit);
    },
    async listBackInStock(storeId: string, limit = 50): Promise<BackInStockSubscriptionRecord[]> {
      return deps.backInStock.listByStore(storeId, limit);
    },
    async listCommentUnlockCampaigns(storeId: string): Promise<CommentUnlockCampaignRecord[]> {
      return deps.commentUnlocks.listCampaignsByStore(storeId);
    },
  };
}
