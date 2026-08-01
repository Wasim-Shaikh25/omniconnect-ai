import { abandonedCartSweep } from "@/modules/ecommerce";
import { logger } from "@/shared/observability";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export async function sweepAbandonedCarts(): Promise<number> {
  try {
    return await abandonedCartSweep();
  } catch (error) {
    logger.error("abandonedCart.sweep.failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return 0;
  }
}

/**
 * Starts the abandoned-cart sweep. Runs immediately once, then every 15 minutes.
 */
export function startAbandonedCartSweep(): void {
  void sweepAbandonedCarts();
  setInterval(() => {
    void sweepAbandonedCarts();
  }, FIFTEEN_MINUTES_MS);
}
