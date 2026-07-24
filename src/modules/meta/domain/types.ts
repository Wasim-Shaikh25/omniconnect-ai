/** Normalized Meta primitives shared across the module (pure domain). */

export const META_CHANNELS = ["INSTAGRAM", "FACEBOOK"] as const;
export type MetaChannel = (typeof META_CHANNELS)[number];

export const META_EVENT_KINDS = ["message", "follow", "comment"] as const;
export type MetaEventKind = (typeof META_EVENT_KINDS)[number];

/** A single inbound Meta event after normalization from the raw webhook payload. */
export interface NormalizedMetaEvent {
  kind: MetaEventKind;
  channel: MetaChannel;
  /** Page id (FB) or IG business account id — used to resolve the owning store. */
  accountId: string;
  externalUserId: string;
  username: string | null;
  text: string | null;
  externalRef: string | null;
}
