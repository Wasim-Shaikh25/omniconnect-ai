import { logger } from "@/shared/observability/logger";
import type { EcommerceProvider } from "@/modules/workspaces";
import type {
  ConnectorCredentials,
  EcommerceConnector,
} from "../domain/connector";
import { MockConnector } from "./providers/mock.connector";
import { ConfigInterpreter } from "./config-interpreter";
import { getShopifyAdapterMapping, validateShopDomain } from "./shopify-adapter-mapping";

/**
 * Provider registry — the single place that maps a provider + credentials to a
 * concrete connector. Callers depend on `EcommerceConnector`, never a provider.
 *
 * Shopify is resolved through the dynamic `ConfigInterpreter` using a built-in
 * `AdapterConfigMapping`; all other built-in providers fall back to the Mock
 * connector when live credentials are missing.
 */
export function getConnector(
  provider: EcommerceProvider,
  credentials: ConnectorCredentials,
): EcommerceConnector {
  const { shopDomain, accessToken, refreshToken } = credentials;

  if (provider === "SHOPIFY" && shopDomain && accessToken) {
    logger.info("ecommerce.connector.resolved", { provider: "SHOPIFY" });
    const domain = validateShopDomain(shopDomain);
    return new ConfigInterpreter(getShopifyAdapterMapping(), {
      shopDomain: domain,
      accessToken,
      refreshToken: refreshToken ?? "",
    });
  }

  logger.info("ecommerce.connector.resolved", {
    provider: "MOCK",
    requested: provider,
  });
  return new MockConnector(shopDomain ?? null);
}
