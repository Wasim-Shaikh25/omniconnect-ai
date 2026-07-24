import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import type { MetaIntegrationRepository, MetaService } from "../application/ports";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

/**
 * Outbound Graph API adapter. Config-gated: without a stored page token (or in
 * dev) it no-ops after logging, so the rest of the flow works without a live
 * Meta app. Tokens are read from infrastructure and never logged.
 */
export class GraphApiMetaService implements MetaService {
  constructor(private readonly integrations: MetaIntegrationRepository) {}

  async sendMessage(input: {
    storeId: string;
    recipientId: string;
    text: string;
  }): Promise<void> {
    const token = await this.integrations.findAccessToken(input.storeId);
    if (!token || !env.META_APP_ID) {
      logger.info("meta.sendMessage.skipped", {
        storeId: input.storeId,
        reason: "not-configured",
      });
      return;
    }

    const res = await fetch(`${GRAPH_API_BASE}/me/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: input.recipientId },
        message: { text: input.text },
      }),
    });

    if (!res.ok) {
      logger.warn("meta.sendMessage.failed", {
        storeId: input.storeId,
        status: res.status,
      });
      return;
    }

    logger.info("meta.sendMessage.ok", { storeId: input.storeId });
  }
}
