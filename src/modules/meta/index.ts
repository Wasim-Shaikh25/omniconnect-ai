/**
 * Meta module — public barrel.
 *
 * The ONLY entry point other modules may import from `@/modules/meta`.
 * Verifies + ingests Meta webhooks, normalizes them into domain events, and
 * publishes them on the shared bus. Owns META `Integration` persistence. It does
 * NOT write conversation/customer tables — `conversations` and `crm` subscribe.
 */
export const MODULE_NAME = "meta" as const;

// Domain — normalized primitives + events
export { META_CHANNELS, META_EVENT_KINDS } from "./domain/types";
export type {
  MetaChannel,
  MetaEventKind,
  NormalizedMetaEvent,
} from "./domain/types";
export {
  MetaMessageReceived,
  MetaFollowReceived,
  MetaCommentReceived,
} from "./domain/events";
export type {
  MetaMessageReceivedPayload,
  MetaFollowReceivedPayload,
  MetaCommentReceivedPayload,
} from "./domain/events";
export {
  MetaError,
  InvalidSignatureError,
  UnknownAccountError,
  MetaNotConnectedError,
} from "./domain/errors";

// Application — schemas and types
export { connectMetaSchema } from "./application/connect-meta";
export type { ConnectMetaInput } from "./application/connect-meta";
export { simulateInboundSchema } from "./application/simulate-inbound";
export type { SimulateInboundInput } from "./application/simulate-inbound";
export type {
  MetaIntegrationRecord,
  MetaService,
  MetaMediaItem,
  MetaMediaMetrics,
  HashtagMediaOptions,
} from "./application/ports";
export type { MetaConnectionView } from "./application/queries";

// Presentation
export {
  connectMetaAction,
  simulateInboundAction,
  searchHashtagMediaAction,
} from "./presentation/actions";
export type { MetaActionState } from "./presentation/actions";
