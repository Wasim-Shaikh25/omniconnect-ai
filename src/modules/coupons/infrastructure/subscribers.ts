import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import type { FirstTimeFollowerDetectedPayload } from "@/modules/crm";
import { welcomeFirstFollower } from "./container";

const onFirstTimeFollowerDetected: EventHandler = async (event) => {
  const p = event.payload as FirstTimeFollowerDetectedPayload;
  await welcomeFirstFollower({
    storeId: p.storeId,
    followerId: p.followerId,
    customerId: p.customerId,
    externalUserId: p.externalUserId,
    username: p.username,
    channel: p.channel as "INSTAGRAM" | "FACEBOOK",
  });
};

/** Wires the coupons/campaigns module's event subscribers. Call once at startup. */
export function registerCouponsSubscribers(bus: EventBus = eventBus): void {
  bus.subscribe("FirstTimeFollowerDetected", onFirstTimeFollowerDetected);
}
