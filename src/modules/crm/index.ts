/**
 * Crm module — public barrel.
 *
 * The ONLY entry point other modules may import from `@/modules/crm`.
 * Owns Customer + Follower persistence. Subscribes to Meta events to upsert
 * customers and record followers, emitting `FirstTimeFollowerDetected`.
 */
export const MODULE_NAME = "crm" as const;

// Domain events
export { FirstTimeFollowerDetected } from "./domain/events";
export type { FirstTimeFollowerDetectedPayload } from "./domain/events";

// Application record types
export type { CustomerRecord, FollowerRecord } from "./application/ports";

// Queries (composed)
export { crmQueries } from "./infrastructure/container";
