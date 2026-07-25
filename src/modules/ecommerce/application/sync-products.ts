import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability/logger";
import { Result, ok, err } from "@/shared/kernel";
import { ConnectorError, StoreNotConnectedError } from "../domain/errors";
import { ProductsSynced } from "../domain/events";
import type {
  ConnectorFactory,
  ProductRepository,
} from "./ports";

export function makeSyncProducts(deps: {
  connectors: ConnectorFactory;
  products: ProductRepository;
}) {
  return async function syncProducts(
    storeId: string,
  ): Promise<Result<{ count: number }, StoreNotConnectedError | ConnectorError>> {
    let connector;
    try {
      connector = await deps.connectors.forStore(storeId);
    } catch {
      return err(new StoreNotConnectedError(storeId));
    }

    let fetched;
    try {
      fetched = await connector.getProducts(100);
    } catch {
      return err(new ConnectorError(connector.provider, "getProducts"));
    }

    let storeCurrency: string | null = null;
    try {
      const storeInfo = await connector.fetchStoreInfo();
      storeCurrency = storeInfo.currency;
    } catch {
      storeCurrency = null;
    }

    const normalized = fetched.map((p) => ({
      ...p,
      currency: p.currency ?? storeCurrency,
    }));

    const count = await deps.products.upsertMany(storeId, normalized);

    await eventBus.publish(
      new ProductsSynced(storeId, {
        storeId,
        provider: connector.provider,
        count,
      }),
    );

    logger.info("ecommerce.productsSynced", {
      storeId,
      provider: connector.provider,
      count,
    });

    return ok({ count });
  };
}
