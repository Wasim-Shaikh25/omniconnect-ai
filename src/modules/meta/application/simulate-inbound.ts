import { z } from "zod";
import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import { META_CHANNELS, META_EVENT_KINDS } from "../domain/types";
import type { NormalizedMetaEvent } from "../domain/types";
import { publishMetaEvent } from "./publish-event";

export const simulateInboundSchema = z.object({
  projectId: z.string().min(1),
  channel: z.enum(META_CHANNELS).default("INSTAGRAM"),
  kind: z.enum(META_EVENT_KINDS).default("message"),
  externalUserId: z.string().min(1).max(255),
  username: z.string().max(255).optional(),
  text: z.string().max(2000).optional(),
});

export type SimulateInboundInput = z.infer<typeof simulateInboundSchema>;

/**
 * Dev-only helper that publishes a normalized inbound Meta event for a known
 * store, so the full event-driven flow (crm + conversations consumers) can be
 * exercised without a live Meta app. Callers enforce tenant authorization.
 */
export function simulateInbound(raw: SimulateInboundInput): Promise<void> {
  if (env.NODE_ENV === "production") {
    throw new Error("Inbound simulation is disabled in production.");
  }
  const input = simulateInboundSchema.parse(raw);
  const event: NormalizedMetaEvent = {
    kind: input.kind,
    channel: input.channel,
    accountId: `sim-${input.projectId}`,
    externalUserId: input.externalUserId,
    username: input.username ?? null,
    text: input.text ?? (input.kind === "follow" ? null : ""),
    externalRef: null,
  };
  logger.info("meta.simulateInbound", {
    projectId: input.projectId,
    kind: input.kind,
    channel: input.channel,
  });
  return publishMetaEvent(input.projectId, event);
}
