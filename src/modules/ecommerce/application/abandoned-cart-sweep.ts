import { env } from "@/shared/config";
import type { EventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import { AbandonedCartDetected } from "../domain/events";
import type { CartRepository } from "./ports";

export interface AbandonedCartSweepDeps {
  carts: CartRepository;
  eventBus: EventBus;
}

export function makeAbandonedCartSweep(deps: AbandonedCartSweepDeps) {
  return async function sweep(): Promise<number> {
    const thresholdMinutes = env.ABANDONED_CART_THRESHOLD_MINUTES;
    const abandoned = await deps.carts.findAbandoned(thresholdMinutes);
    let published = 0;

    for (const cart of abandoned) {
      const marked = await deps.carts.markNotified(cart.id);
      if (!marked) {
        // Another sweep already marked this cart; do not emit a duplicate event.
        logger.info("abandonedCart.sweep.alreadyNotified", { cartId: cart.id });
        continue;
      }
      await deps.eventBus.publish(
        new AbandonedCartDetected(
          cart.id,
          {
            cartId: cart.id,
            storeId: cart.storeId,
            cartToken: cart.cartToken,
            email: cart.email,
            lineItemTitles: cart.lineItemTitles,
            totalPrice: cart.totalPrice,
            currency: cart.currency,
            recoveredUrl: cart.recoveredUrl,
            detectedAt: new Date(),
          },
          `cart-abandoned-${cart.id}`,
        ),
      );
      published += 1;
      logger.info("abandonedCart.sweep.published", {
        cartId: cart.id,
        storeId: cart.storeId,
        cartToken: cart.cartToken,
      });
    }

    logger.info("abandonedCart.sweep.complete", {
      thresholdMinutes,
      scanned: abandoned.length,
      published,
    });
    return published;
  };
}

export type AbandonedCartSweep = ReturnType<typeof makeAbandonedCartSweep>;
