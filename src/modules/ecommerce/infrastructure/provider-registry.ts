import { logger } from "@/shared/observability/logger";
import type { EcommerceProvider } from "@/modules/organizations";
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
 * When live credentials are missing we fall back to the Mock connector so the
 * app is fully usable in local/dev. Only the provider name is logged — never
 * the credentials.
 */
export function getConnector(
  provider: EcommerceProvider,
  credentials: ConnectorCredentials,
): EcommerceConnector {
  const { shopDomain, accessToken } = credentials;

  if (provider === "SHOPIFY" && shopDomain && accessToken) {
    logger.info("ecommerce.connector.resolved", { provider: "SHOPIFY" });
    return new ShopifyConnector(shopDomain, accessToken);
  }

  logger.info("ecommerce.connector.resolved", {
    provider: "MOCK",
    requested: provider,
  });
  return new MockConnector(shopDomain ?? null);
}
