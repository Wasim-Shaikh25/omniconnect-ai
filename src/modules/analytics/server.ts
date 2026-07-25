/**
 * Server-only analytics module barrel.
 *
 * Exposes the composed queries and services without pulling in presentation
 * actions, keeping server-side consumers (e.g. intelligence composition root)
 * free of heavy client/server action bundles.
 */
import { metaService } from "@/modules/meta/server";
import type { MetaMediaItem } from "@/modules/meta";

export {
  analyticsQueries,
  getMarketingPerformance,
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
