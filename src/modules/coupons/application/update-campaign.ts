import { z } from "zod";
import type { CampaignRepository, CampaignRecord } from "./ports";

export const updateCampaignSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  discountPct: z.coerce.number().int().min(1).max(100).optional(),
  couponTtlDays: z.coerce.number().int().min(1).max(365).optional(),
  messageTemplate: z.string().min(1).max(2000).optional(),
  active: z.coerce.boolean().optional(),
});

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export function makeUpdateCampaign(deps: { campaigns: CampaignRepository }) {
  return async function updateCampaign(
    input: UpdateCampaignInput,
  ): Promise<CampaignRecord> {
    const { storeId, ...rest } = updateCampaignSchema.parse(input);
    return deps.campaigns.update(storeId, "FIRST_TIME_FOLLOWER", rest);
  };
}

export type UpdateCampaign = ReturnType<typeof makeUpdateCampaign>;
