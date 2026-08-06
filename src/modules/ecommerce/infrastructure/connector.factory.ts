import { ProviderNotSupportedError, StoreNotConnectedError } from "../domain/errors";
import type { EcommerceConnector } from "../domain/connector";
import type { AdapterConfigMapping } from "../domain/adapter-config";
import type {
  ConnectorFactory,
  DynamicConnectorFactory,
  GeneratedAdapterRepository,
  IntegrationRepository,
} from "../application/ports";
import { getConnector } from "./provider-registry";

const LEGACY_PROVIDERS = new Set(["WOOCOMMERCE", "BIGCOMMERCE"]);

function isAdapterMapping(value: unknown): value is AdapterConfigMapping {
  return (
    typeof value === "object" &&
    value !== null &&
    "platformName" in value &&
    typeof (value as { platformName: unknown }).platformName === "string" &&
    "baseUrl" in value &&
    typeof (value as { baseUrl: unknown }).baseUrl === "string" &&
    "endpoints" in value
  );
}

/** Resolves a live connector for a store from generated adapter or legacy credentials. */
export class IntegrationConnectorFactory implements ConnectorFactory {
  constructor(
    private readonly integrations: IntegrationRepository,
    private readonly generatedAdapters: GeneratedAdapterRepository,
    private readonly buildConnector: DynamicConnectorFactory["build"],
  ) {}

  async forStore(projectId: string): Promise<EcommerceConnector> {
    const generated = await this.generatedAdapters.findByProject(projectId);
    if (generated?.isActive) {
      return this.buildConnector(generated.config, generated.credentials);
    }

    const creds = await this.integrations.findCredentialsByStore(projectId);
    if (!creds) throw new StoreNotConnectedError(projectId);

    if (creds.metadata && isAdapterMapping(creds.metadata)) {
      const credentials: Record<string, string> = {};
      if (creds.shopDomain) credentials.shopDomain = creds.shopDomain;
      if (creds.accessToken) credentials.accessToken = creds.accessToken;
      if (creds.refreshToken) credentials.refreshToken = creds.refreshToken;
      return this.buildConnector(creds.metadata, credentials);
    }

    if (LEGACY_PROVIDERS.has(creds.provider)) {
      throw new ProviderNotSupportedError(creds.provider);
    }

    return getConnector(creds.provider, {
      shopDomain: creds.shopDomain ?? undefined,
      accessToken: creds.accessToken ?? undefined,
      refreshToken: creds.refreshToken ?? undefined,
      metadata: (creds.metadata as Record<string, string | undefined>) ?? undefined,
    });
  }
}
