import { eventBus, setEventBus } from "@/shared/events";
import { QueueEventBus } from "@/shared/events/queue-event-bus";
import { registerOrganizationSubscribers } from "@/modules/workspaces/bootstrap";
import { registerUsersSubscribers } from "@/modules/users/bootstrap";
import { registerCrmSubscribers } from "@/modules/crm/bootstrap";
import { registerCouponsBootstrap } from "@/modules/coupons/bootstrap";
import { registerAiSubscribers } from "@/modules/ai/bootstrap";
import { registerConversationsSubscribers } from "@/modules/conversations/bootstrap";
import { registerNotificationsSubscribers } from "@/modules/notifications/bootstrap";
import { registerSocialSubscribers } from "@/modules/social";
import { registerGrowthSubscribers } from "@/modules/growth/bootstrap";
import { registerIntelligenceSubscribers } from "@/modules/intelligence/bootstrap";
import { registerAttributionSubscribers } from "@/modules/attribution";
import { registerContentJobHandlers } from "@/modules/content/server";

/**
 * App composition root for event subscribers.
 *
 * Wires each module's subscribers onto the shared bus exactly once. Called from
 * the root layout (a Node server component) so the module graph never reaches
 * the edge/client bundles. Idempotent — safe to call on every render.
 */
let wired = false;
let durableInstalled = false;

export function ensureSubscribers(): void {
  if (!durableInstalled && typeof window === "undefined") {
    durableInstalled = true;
    setEventBus(new QueueEventBus());
  }
  if (wired) return;
  wired = true;
  registerOrganizationSubscribers(eventBus);
  registerUsersSubscribers(eventBus);
  registerCrmSubscribers(eventBus);
  registerCouponsBootstrap(eventBus);
  registerConversationsSubscribers(eventBus);
  registerAiSubscribers(eventBus);
  registerNotificationsSubscribers(eventBus);
  registerSocialSubscribers(eventBus);
  registerGrowthSubscribers(eventBus);
  registerIntelligenceSubscribers(eventBus);
  registerAttributionSubscribers(eventBus);
  registerContentJobHandlers();
}
