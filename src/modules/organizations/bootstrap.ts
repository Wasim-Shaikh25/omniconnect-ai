/**
 * Light bootstrap entry — subscriber wiring only.
 *
 * Kept separate from the public barrel so the app startup (`instrumentation.ts`)
 * can register event handlers without loading the module's presentation/auth graph.
 */
export { registerOrganizationSubscribers } from "./infrastructure/subscribers";
