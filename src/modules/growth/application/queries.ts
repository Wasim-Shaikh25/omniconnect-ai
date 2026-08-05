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
    async listUgc(projectId: string, limit = 50): Promise<UgcAssetRecord[]> {
      return deps.ugc.listByStore(projectId, limit);
    },
    async listAmbassadors(projectId: string, limit = 50): Promise<AmbassadorRecord[]> {
      return deps.ambassadors.listByStore(projectId, limit);
    },
    async listReferrals(projectId: string, limit = 50): Promise<ReferralOrderRecord[]> {
      return deps.referrals.listByStore(projectId, limit);
    },
    async listCampaigns(projectId: string, limit = 50): Promise<DmCampaignRecord[]> {
      return deps.campaigns.listByStore(projectId, limit);
    },
    async listBackInStock(projectId: string, limit = 50): Promise<BackInStockSubscriptionRecord[]> {
      return deps.backInStock.listByStore(projectId, limit);
    },
    async listCommentUnlockCampaigns(projectId: string): Promise<CommentUnlockCampaignRecord[]> {
      return deps.commentUnlocks.listCampaignsByStore(projectId);
    },
  };
}
