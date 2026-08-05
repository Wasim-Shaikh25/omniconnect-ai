import { StoreNotConnectedError } from "../domain/errors";
import type { EcommerceConnector } from "../domain/connector";
import type {
  ConnectorFactory,
  IntegrationRepository,
} from "../application/ports";
import { getConnector } from "./provider-registry";

const PROVIDERS = [
  "SHOPIFY",
  "WOOCOMMERCE",
  "BIGCOMMERCE",
  "MAGENTO",
  "WIX",
  "CUSTOM",
] as const;

type Provider = (typeof PROVIDERS)[number];

function asProvider(value: string): Provider {
  return (PROVIDERS as readonly string[]).includes(value)
    ? (value as Provider)
    : "CUSTOM";
}

/** Resolves a live connector for a store from its stored integration credentials. */
export class IntegrationConnectorFactory implements ConnectorFactory {
  constructor(private readonly integrations: IntegrationRepository) {}

  async forStore(projectId: string): Promise<EcommerceConnector> {
    const creds = await this.integrations.findCredentialsByStore(projectId);
    if (!creds) throw new StoreNotConnectedError(projectId);

    return getConnector(asProvider(creds.provider), {
      shopDomain: creds.shopDomain ?? undefined,
      accessToken: creds.accessToken ?? undefined,
      refreshToken: creds.refreshToken ?? undefined,
      metadata: (creds.metadata as Record<string, string | undefined>) ?? undefined,
    });
  }
}
