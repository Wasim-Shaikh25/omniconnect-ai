/**
 * Social module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/social`.
 * It exposes engagement automation services and actions for Phase 2B.
 */
export const MODULE_NAME = "social" as const;

export type {
  SocialCommentRecord,
  SocialMentionRecord,
  SocialQueries,
  SocialAutomationService,
} from "./application/ports";
export type { SocialLeadRecord } from "./application/lead.ports";

export { socialAutomationService, socialQueries } from "./infrastructure/container";

export {
  listSocialCommentsAction,
  replyToCommentAction,
  toggleCommentHiddenAction,
} from "./presentation/actions";
export {
  listLeadsAction,
  captureLeadAction,
  scoreLeadAction,
} from "./presentation/lead.actions";

export { registerSocialSubscribers } from "./infrastructure/subscribers";
