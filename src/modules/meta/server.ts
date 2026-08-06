/**
 * Server-only meta module barrel.
 *
 * Exports the wired application services / composition root. Client code should
 * use `@/modules/meta` (types + actions) instead.
 */
export {
  connectMeta,
  processMetaWebhook,
  metaQueries,
  metaService,
} from "./infrastructure/container";
export {
  getMetaOAuthUrl,
  exchangeMetaOAuthCode,
  fetchInstagramAccount,
} from "./infrastructure/meta-oauth";
export type { MetaOAuthAccount } from "./infrastructure/meta-oauth";
export {
  verifyWebhookChallenge,
  verifyWebhookSignature,
} from "./application/verify-webhook";
export { webhookGuard } from "./infrastructure/webhook-guard";
