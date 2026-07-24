/**
 * Light bootstrap entry — subscriber wiring only.
 *
 * Kept separate from the public barrel so the app composition root can register
 * event handlers without loading the module's presentation graph.
 */
export { registerConversationsSubscribers } from "./infrastructure/subscribers";
