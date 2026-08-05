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
    projectId: string,
  ): Promise<Result<{ count: number; deleted: number }, StoreNotConnectedError | ConnectorError>> {
    let connector;
    try {
      connector = await deps.connectors.forStore(projectId);
    } catch {
      return err(new StoreNotConnectedError(projectId));
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

    const { upserted: count, removed: deletedCount } = await deps.products.sync(
      projectId,
      normalized,
    );

    await eventBus.publish(
      new ProductsSynced(projectId, {
        projectId,
        provider: connector.provider,
        count,
        products: normalized.map((p) => ({
          externalId: p.externalId,
          title: p.title,
          inventory: p.inventory ?? null,
        })),
      }),
    );

    logger.info("ecommerce.productsSynced", {
      projectId,
      provider: connector.provider,
      count,
      deleted: deletedCount,
    });

    return ok({ count, deleted: deletedCount });
  };
}
