import { eventBus } from "@/shared/events";
import { registerOrganizationSubscribers } from "@/modules/organizations/bootstrap";
import { registerUsersSubscribers } from "@/modules/users/bootstrap";
import { registerCrmSubscribers } from "@/modules/crm/bootstrap";
import { registerConversationsSubscribers } from "@/modules/conversations/bootstrap";

/**
 * App composition root for event subscribers.
 *
 * Wires each module's subscribers onto the shared bus exactly once. Called from
 * the root layout (a Node server component) so the module graph never reaches
 * the edge/client bundles. Idempotent — safe to call on every render.
 */
let wired = false;

export function ensureSubscribers(): void {
  if (wired) return;
  wired = true;
  registerOrganizationSubscribers(eventBus);
  registerUsersSubscribers(eventBus);
  registerCrmSubscribers(eventBus);
  registerConversationsSubscribers(eventBus);
}
