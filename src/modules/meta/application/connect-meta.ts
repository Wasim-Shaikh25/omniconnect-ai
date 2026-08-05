import { z } from "zod";
import { logger } from "@/shared/observability";
import { META_CHANNELS } from "../domain/types";
import type { MetaIntegrationRecord, MetaIntegrationRepository } from "./ports";

export const connectMetaSchema = z.object({
  storeId: z.string().min(1),
  channel: z.enum(META_CHANNELS),
  accountId: z.string().min(1).max(255),
  accessToken: z.string().max(512).optional(),
});

export type ConnectMetaInput = z.infer<typeof connectMetaSchema>;

/**
 * Connects a Facebook Page / Instagram Business account to a store by persisting
 * a META integration (account id + page token). The token is stored only in
 * infrastructure and never logged.
 */
export function makeConnectMeta(deps: {
  integrations: MetaIntegrationRepository;
}) {
  return async function connectMeta(
    raw: ConnectMetaInput,
  ): Promise<MetaIntegrationRecord> {
    const input = connectMetaSchema.parse(raw);
    const record = await deps.integrations.connect({
      storeId: input.storeId,
      channel: input.channel,
      accountId: input.accountId,
      accessToken: input.accessToken ?? null,
    });
    logger.info("meta.connected", {
      storeId: input.storeId,
      channel: input.channel,
    });
    return record;
  };
}

export type ConnectMeta = ReturnType<typeof makeConnectMeta>;
