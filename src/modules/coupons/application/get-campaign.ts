import type { CampaignRepository, CampaignRecord } from "./ports";

export function makeGetCampaign(deps: { campaigns: CampaignRepository }) {
  return async function getCampaign(
    storeId: string,
  ): Promise<CampaignRecord> {
    return deps.campaigns.getOrCreateDefault(storeId, "FIRST_TIME_FOLLOWER");
  };
}

export type GetCampaign = ReturnType<typeof makeGetCampaign>;
