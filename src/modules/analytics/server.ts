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
import { getBestTimeToPost } from "./application/best-time-to-post";
import { getContentCalendar } from "./application/content-calendar";
import type { ProductRecord } from "@/modules/ecommerce";

export {
  analyticsQueries,
  getCompetitorBenchmark,
  getCompetitorComparisonDashboard,
  marketingInsightsService,
  marketingInsightsRepository,
  queryAnalytics,
} from "./infrastructure/container";
export { PrismaTrackedAccountRepository } from "./infrastructure/tracked-account.repository";
export { PrismaMarketingInsightsRepository } from "./infrastructure/marketing-insights.repository";

/** Fetch the connected Meta account's own media. Kept server-only to avoid pulling node:crypto into the client bundle. */
export async function getAccountMedia(
  projectId: string,
  limit?: number,
): Promise<MetaMediaItem[]> {
  return metaService.getAccountMedia(projectId, limit);
}

/** Server-only marketing performance with richer media metrics and post-to-order attribution. */
export const getMarketingPerformance = makeGetMarketingPerformance({
  ecommerce: ecommerceQueries,
  conversations: conversationQueries,
  crm: crmQueries,
  social: socialQueries,
  eventBus,
  getAccountMedia,
  getPageInsights: (projectId, days) => metaService.getPageInsights(projectId, days),
  getAudienceInsights: (projectId) => metaService.getAudienceInsights(projectId),
});

/** Compute the best hours/days to post from historical media engagement and order timing. */
export async function getBestTimeToPostForStore(projectId: string): Promise<ReturnType<typeof getBestTimeToPost>> {
  const [media, orders] = await Promise.all([
    getAccountMedia(projectId, 100),
    ecommerceQueries.listOrders(projectId, 500).catch(() => []),
  ]);
  return getBestTimeToPost({ media, orders });
}

/** Build an AI content calendar for the next 7 days using best-time-to-post and product catalog. */
export async function getContentCalendarForStore(
  projectId: string,
  products: Pick<ProductRecord, "title">[] = [],
): Promise<ReturnType<typeof getContentCalendar>> {
  const [media, orders, storeProducts] = await Promise.all([
    getAccountMedia(projectId, 100),
    ecommerceQueries.listOrders(projectId, 500).catch(() => []),
    products.length > 0 ? Promise.resolve(products) : ecommerceQueries.listProducts(projectId, 50).catch(() => []),
  ]);
  return getContentCalendar({ media, orders, products: storeProducts });
}
