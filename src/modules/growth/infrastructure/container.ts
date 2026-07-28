import { crmQueries } from "@/modules/crm";
import { metaService } from "@/modules/meta/server";
import {
  PrismaUgcRepository,
  PrismaAmbassadorRepository,
  PrismaReferralOrderRepository,
  PrismaDmCampaignRepository,
  PrismaBackInStockRepository,
  PrismaCommentUnlockRepository,
} from "./repositories";
import { makeGrowthService } from "../application/service";
import { makeGrowthQueries } from "../application/queries";
import { makeDetectGrowthInsights } from "../application/detect-insights";

const ugc = new PrismaUgcRepository();
const ambassadors = new PrismaAmbassadorRepository();
const referrals = new PrismaReferralOrderRepository();
const campaigns = new PrismaDmCampaignRepository();
const backInStock = new PrismaBackInStockRepository();
const commentUnlocks = new PrismaCommentUnlockRepository();

export const growthService = makeGrowthService({
  ugc,
  ambassadors,
  referrals,
  campaigns,
  backInStock,
  commentUnlocks,
  meta: metaService,
  getCustomerConsent: async (input) => {
    const profile = await crmQueries.getCustomerProfile(input);
    return profile?.customer.consent ?? null;
  },
});

export const growthQueries = makeGrowthQueries({
  ugc,
  ambassadors,
  referrals,
  campaigns,
  backInStock,
  commentUnlocks,
});
export const detectGrowthInsights = makeDetectGrowthInsights({ growth: growthQueries });
