import { z } from "zod";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability/logger";
import { Result, ok, err } from "@/shared/kernel";
import { ECOMMERCE_PROVIDERS } from "@/modules/workspaces";
import { getConnector } from "../infrastructure/provider-registry";
import { ConnectorError } from "../domain/errors";
import { StoreConnected } from "../domain/events";
import type { IntegrationRecord, IntegrationRepository } from "./ports";

export const connectStoreSchema = z.object({
  projectId: z.string().min(1),
  provider: z.enum(ECOMMERCE_PROVIDERS).default("SHOPIFY"),
  shopDomain: z.string().max(255).optional(),
  accessToken: z.string().max(1024).optional(),
  consumerKey: z.string().max(255).optional(),
  consumerSecret: z.string().max(255).optional(),
  storeHash: z.string().max(255).optional(),
});

export type ConnectStoreInput = z.infer<typeof connectStoreSchema>;

export function makeConnectStore(deps: {
  integrations: IntegrationRepository;
}) {
  return async function connectStore(
    raw: ConnectStoreInput,
  ): Promise<Result<IntegrationRecord, ConnectorError>> {
    const input = connectStoreSchema.parse(raw);

    const connector = getConnector(input.provider, {
      shopDomain: input.shopDomain,
      accessToken: input.accessToken,
      metadata: {
        consumerKey: input.consumerKey,
        consumerSecret: input.consumerSecret,
        storeHash: input.storeHash,
      },
    });

    // Validate the connection before persisting it.
    let info;
    try {
      info = await connector.fetchStoreInfo();
    } catch {
      return err(new ConnectorError(input.provider, "fetchStoreInfo"));
    }

    const metadata: Record<string, string> = {};
    if (input.provider === "WOOCOMMERCE" && input.consumerKey && input.consumerSecret) {
      metadata.consumerKey = input.consumerKey;
      metadata.consumerSecret = input.consumerSecret;
    }
    if (input.provider === "BIGCOMMERCE" && input.storeHash) {
      metadata.storeHash = input.storeHash;
    }

    const integration = await deps.integrations.upsertEcommerce({
      projectId: input.projectId,
      provider: input.provider,
      shopDomain: input.shopDomain ?? info.domain ?? null,
      accessToken: input.accessToken ?? null,
      scopes: null,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    });

    await eventBus.publish(
      new StoreConnected(input.projectId, {
        projectId: input.projectId,
        provider: input.provider,
        shopDomain: integration.shopDomain,
      }),
    );

    logger.info("ecommerce.storeConnected", {
      projectId: input.projectId,
      provider: input.provider,
    });

    return ok(integration);
  };
}
