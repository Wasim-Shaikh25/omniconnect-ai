import { prisma } from "@/shared/database";
import { logger } from "@/shared/observability";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function pruneProcessedWebhookEvents(): Promise<number> {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const result = await prisma.processedWebhookEvent.deleteMany({
    where: { processedAt: { lt: cutoff } },
  });
  logger.info("webhook.retention.pruned", { count: result.count, cutoff: cutoff.toISOString() });
  return result.count;
}

/**
 * Starts a daily retention sweep for the webhook idempotency ledger.
 * Runs immediately once to clear stale rows, then every 24 hours.
 */
export function startWebhookRetention(): void {
  void pruneProcessedWebhookEvents();
  setInterval(() => {
    void pruneProcessedWebhookEvents();
  }, 24 * 60 * 60 * 1000);
}
