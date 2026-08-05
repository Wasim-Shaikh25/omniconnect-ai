import { logger } from "@/shared/observability";
import { normalizeMetaWebhook } from "./normalize-webhook";
import { publishMetaEvent } from "./publish-event";
import type { MetaIntegrationRepository } from "./ports";

export interface ProcessWebhookResult {
  accepted: boolean;
  published: number;
}

/**
 * Application use-case: normalize a verified webhook payload, resolve each event
 * to its owning store via the META integration, and publish domain events.
 * Signature verification happens at the edge (route handler) before this runs.
 */
export function makeProcessMetaWebhook(deps: {
  integrations: MetaIntegrationRepository;
}) {
  return async function processMetaWebhook(
    raw: unknown,
  ): Promise<ProcessWebhookResult> {
    const events = normalizeMetaWebhook(raw);
    if (!events) return { accepted: false, published: 0 };

    let published = 0;
    for (const event of events) {
      const storeId = await deps.integrations.findStoreByAccountId(
        event.accountId,
      );
      if (!storeId) {
        logger.warn("meta.webhook.unknownAccount", {
          accountId: event.accountId,
          kind: event.kind,
        });
        continue;
      }
      await publishMetaEvent(storeId, event);
      published += 1;
    }

    return { accepted: true, published };
  };
}

export type ProcessMetaWebhook = ReturnType<typeof makeProcessMetaWebhook>;
