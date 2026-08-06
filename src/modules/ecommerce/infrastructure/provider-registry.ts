import { logger } from "@/shared/observability/logger";
import type { EcommerceProvider } from "@/modules/workspaces";
import type {
  ConnectorCredentials,
  EcommerceConnector,
} from "../domain/connector";
import { MockConnector } from "./providers/mock.connector";
import { ShopifyConnector } from "./providers/shopify.connector";

/**
 * Provider registry — the single place that maps a provider + credentials to a
 * concrete connector. Callers depend on `EcommerceConnector`, never a provider.
 *
 * Shopify remains as a built-in reference connector; new/custom platforms should
 * use a generated `AdapterConfigMapping` via `IntegrationConnectorFactory`.
 * WooCommerce and BigCommerce have been removed in favor of dynamic adapters.
 */
export function getConnector(
  provider: EcommerceProvider,
  credentials: ConnectorCredentials,
): EcommerceConnector {
  const { shopDomain, accessToken, refreshToken } = credentials;

  if (provider === "SHOPIFY" && shopDomain && accessToken) {
    logger.info("ecommerce.connector.resolved", { provider: "SHOPIFY" });
    return new ShopifyConnector(shopDomain, accessToken, refreshToken);
  }

  logger.info("ecommerce.connector.resolved", {
    provider: "MOCK",
    requested: provider,
  });
  return new MockConnector(shopDomain ?? null);
}
