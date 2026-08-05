import type { CampaignRepository, CampaignRecord } from "./ports";

export function makeGetCampaign(deps: { campaigns: CampaignRepository }) {
  return async function getCampaign(
    projectId: string,
  ): Promise<CampaignRecord> {
    return deps.campaigns.getOrCreateDefault(projectId, "FIRST_TIME_FOLLOWER");
  };
}

export type GetCampaign = ReturnType<typeof makeGetCampaign>;
