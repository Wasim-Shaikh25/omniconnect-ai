import { z } from "zod";
import { logger } from "@/shared/observability";
import { Result, ok, err } from "@/shared/kernel";
import { ConnectorError, StoreNotConnectedError } from "../domain/errors";
import type { ConnectorFactory, OrderRepository } from "./ports";

export const syncOrdersSchema = z.object({
  storeId: z.string().min(1),
});

export function makeSyncOrders(deps: {
  connectors: ConnectorFactory;
  orders: OrderRepository;
}) {
  return async function syncOrders(
    storeId: string,
  ): Promise<Result<{ count: number; removed: number }, StoreNotConnectedError | ConnectorError>> {
    let connector;
    try {
      connector = await deps.connectors.forStore(storeId);
    } catch {
      return err(new StoreNotConnectedError(storeId));
    }

    let fetched;
    try {
      fetched = await connector.getOrders(250);
    } catch {
      return err(new ConnectorError(connector.provider, "getOrders"));
    }

    const { upserted, removed } = await deps.orders.sync(storeId, fetched);

    logger.info("ecommerce.ordersSynced", {
      storeId,
      provider: connector.provider,
      count: upserted,
      removed,
    });

    return ok({ count: upserted, removed });
  };
}
