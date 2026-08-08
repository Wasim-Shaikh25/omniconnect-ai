import { z } from "zod";
import { logger } from "@/shared/observability";
import { Result, ok, err } from "@/shared/kernel";
import type { EventBus } from "@/shared/events";
import { ConnectorError, StoreNotConnectedError } from "../domain/errors";
import { OrderSynced } from "../domain/events";
import type { ConnectorFactory, OrderRepository } from "./ports";

export const syncOrdersSchema = z.object({
  projectId: z.string().min(1),
});

export function makeSyncOrders(deps: {
  connectors: ConnectorFactory;
  orders: OrderRepository;
  eventBus?: EventBus;
}) {
  return async function syncOrders(
    projectId: string,
  ): Promise<Result<{ count: number }, StoreNotConnectedError | ConnectorError>> {
    let connector;
    try {
      connector = await deps.connectors.forStore(projectId);
    } catch {
      return err(new StoreNotConnectedError(projectId));
    }

    let fetched;
    try {
      fetched = await connector.getOrders(250);
    } catch {
      return err(new ConnectorError(connector.provider, "getOrders"));
    }

    // getOrders(250) returns only the connector's most recent page, not the store's
    // full order history, so this must never delete orders absent from that page.
    const upserted = await deps.orders.upsertMany(projectId, fetched);

    if (deps.eventBus) {
      await Promise.all(
        fetched.map((order) =>
          deps.eventBus?.publish(
            new OrderSynced(projectId, { projectId, order }),
          ),
        ),
      );
    }

    logger.info("ecommerce.ordersSynced", {
      projectId,
      provider: connector.provider,
      count: upserted,
    });

    return ok({ count: upserted });
  };
}
