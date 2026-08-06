import { logger } from "@/shared/observability/logger";
import type {
  ConnectorCredentials,
  EcommerceConnector,
} from "../domain/connector";
import { ProviderNotSupportedError } from "../domain/errors";
import { MockConnector } from "./providers/mock.connector";
import { ConfigInterpreter } from "./config-interpreter";
import { getShopifyAdapterMapping, validateShopDomain } from "./shopify-adapter-mapping";

/**
 * Provider registry — the single place that maps a provider + credentials to a
 * concrete connector. Callers depend on `EcommerceConnector`, never a provider.
 *
 * Shopify is resolved through the dynamic `ConfigInterpreter` using a built-in
 * `AdapterConfigMapping`; other built-in providers without live implementations
 * fall back to the Mock connector for demo/staging. Legacy WooCommerce and
 * BigCommerce connections raise `ProviderNotSupportedError` so stale rows do
 * not silently corrupt real catalog data.
 */
export function getConnector(
  provider: string,
  credentials: ConnectorCredentials,
): EcommerceConnector {
  if (provider === "WOOCOMMERCE" || provider === "BIGCOMMERCE") {
    throw new ProviderNotSupportedError(provider);
  }

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
