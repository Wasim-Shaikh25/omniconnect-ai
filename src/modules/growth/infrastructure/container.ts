import {
  PrismaUgcRepository,
  PrismaAmbassadorRepository,
  PrismaReferralOrderRepository,
  PrismaDmCampaignRepository,
  PrismaBackInStockRepository,
} from "./repositories";
import { makeGrowthService } from "../application/service";
import { makeGrowthQueries } from "../application/queries";

const ugc = new PrismaUgcRepository();
const ambassadors = new PrismaAmbassadorRepository();
const referrals = new PrismaReferralOrderRepository();
const campaigns = new PrismaDmCampaignRepository();
const backInStock = new PrismaBackInStockRepository();

export const growthService = makeGrowthService({
  ugc,
  ambassadors,
  referrals,
  campaigns,
  backInStock,
});

export const growthQueries = makeGrowthQueries({
  ugc,
  ambassadors,
  referrals,
  campaigns,
  backInStock,
});
