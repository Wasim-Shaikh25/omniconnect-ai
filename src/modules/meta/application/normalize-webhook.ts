import { z } from "zod";
import type { MetaChannel, NormalizedMetaEvent } from "../domain/types";

/**
 * Permissive schema for the parts of a Meta webhook payload we consume. Unknown
 * fields are ignored; a structurally invalid payload fails `safeParse` and is
 * rejected by the caller (no untyped throws downstream).
 */
const messagingSchema = z.object({
  sender: z.object({ id: z.string() }),
  message: z
    .object({ mid: z.string().optional(), text: z.string() })
    .optional(),
});

const changeSchema = z.object({
  field: z.string(),
  value: z
    .object({
      verb: z.string().optional(),
      from: z
        .object({ id: z.string(), username: z.string().optional() })
        .optional(),
      text: z.string().optional(),
      post_id: z.string().optional(),
      media_id: z.string().optional(),
    })
    .optional(),
});

const entrySchema = z.object({
  id: z.string(),
  messaging: z.array(messagingSchema).optional(),
  changes: z.array(changeSchema).optional(),
});

const webhookSchema = z.object({
  object: z.string(),
  entry: z.array(entrySchema),
});

export type MetaWebhookPayload = z.infer<typeof webhookSchema>;

function channelForObject(object: string): MetaChannel {
  return object === "instagram" ? "INSTAGRAM" : "FACEBOOK";
}

/**
 * Normalizes a raw Meta webhook payload into domain-level events. Returns `null`
 * when the payload shape is invalid so the caller can reject it without throwing.
 */
export function normalizeMetaWebhook(
  raw: unknown,
): NormalizedMetaEvent[] | null {
  const parsed = webhookSchema.safeParse(raw);
  if (!parsed.success) return null;

  const channel = channelForObject(parsed.data.object);
  const events: NormalizedMetaEvent[] = [];

  for (const entry of parsed.data.entry) {
    for (const m of entry.messaging ?? []) {
      if (!m.message?.text) continue;
      events.push({
        kind: "message",
        channel,
        accountId: entry.id,
        externalUserId: m.sender.id,
        username: null,
        text: m.message.text,
        externalRef: m.message.mid ?? null,
      });
    }

    for (const c of entry.changes ?? []) {
      const value = c.value;
      if (!value?.from) continue;

      if (c.field === "comments" || c.field === "feed") {
        events.push({
          kind: "comment",
          channel,
          accountId: entry.id,
          externalUserId: value.from.id,
          username: value.from.username ?? null,
          text: value.text ?? "",
          externalRef: value.post_id ?? value.media_id ?? null,
        });
      } else if (c.field === "follows" || value.verb === "follow") {
        events.push({
          kind: "follow",
          channel,
          accountId: entry.id,
          externalUserId: value.from.id,
          username: value.from.username ?? null,
          text: null,
          externalRef: null,
        });
      }
    }
  }

  return events;
}
