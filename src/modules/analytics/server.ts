/**
 * Server-only analytics module barrel.
 *
 * Exposes the composed queries and services without pulling in presentation
 * actions, keeping server-side consumers (e.g. intelligence composition root)
 * free of heavy client/server action bundles.
 */
import { metaService } from "@/modules/meta/server";
import { ecommerceQueries } from "@/modules/ecommerce";
import { conversationQueries } from "@/modules/conversations";
import { crmQueries } from "@/modules/crm";
import { socialQueries } from "@/modules/social";
import { eventBus } from "@/shared/events";
import type { MetaMediaItem } from "@/modules/meta";
import { makeGetMarketingPerformance } from "./application/marketing-analytics";

export {
  analyticsQueries,
  getCompetitorBenchmark,
} from "./infrastructure/container";
export { PrismaTrackedAccountRepository } from "./infrastructure/tracked-account.repository";

/** Fetch the connected Meta account's own media. Kept server-only to avoid pulling node:crypto into the client bundle. */
export async function getAccountMedia(
  storeId: string,
  limit?: number,
): Promise<MetaMediaItem[]> {
  return metaService.getAccountMedia(storeId, limit);
}

/** Server-only marketing performance with richer media metrics and post-to-order attribution. */
export const getMarketingPerformance = makeGetMarketingPerformance({
  ecommerce: ecommerceQueries,
  conversations: conversationQueries,
  crm: crmQueries,
  social: socialQueries,
  eventBus,
  getAccountMedia,
  getPageInsights: (storeId, days) => metaService.getPageInsights(storeId, days),
  getAudienceInsights: (storeId) => metaService.getAudienceInsights(storeId),
});
