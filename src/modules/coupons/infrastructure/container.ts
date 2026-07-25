import { generateWelcome } from "@/modules/ai/server";
import { crmCommands } from "@/modules/crm";
import { conversationCommands } from "@/modules/conversations";
import { generateCoupon } from "@/modules/ecommerce";
import { metaService } from "@/modules/meta/server";
import { makeGetCampaign } from "../application/get-campaign";
import { makeUpdateCampaign } from "../application/update-campaign";
import { makeWelcomeFirstFollower } from "../application/welcome-first-follower";
import { PrismaCampaignRepository } from "./campaign.repository";

const campaigns = new PrismaCampaignRepository();

/** Composition root for the coupons/campaigns module. */
export const couponsQueries = {
  getCampaign: makeGetCampaign({ campaigns }),
};

export const updateCampaign = makeUpdateCampaign({ campaigns });

export const welcomeFirstFollower = makeWelcomeFirstFollower({
  campaigns,
  generateCoupon,
  generateWelcome,
  metaService,
  crmCommands,
  conversationCommands,
});
