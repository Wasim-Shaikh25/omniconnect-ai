/**
 * Lightweight AI domain events barrel.
 *
 * Use this entry point when you only need the event contracts and want to avoid
 * pulling in the full AI composition root (which depends on the intelligence
 * module for marketing context).
 */
export {
  ReplyGenerated,
  EscalationRequested,
} from "./domain/events";

export type {
  ReplyGeneratedPayload,
  EscalationRequestedPayload,
} from "./domain/events";
