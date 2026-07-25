import type { EventBus } from "@/shared/events";
import { registerCouponsSubscribers } from "./infrastructure/subscribers";

/** Wire coupons/campaigns event subscribers once. */
export function registerCouponsBootstrap(bus: EventBus): void {
  registerCouponsSubscribers(bus);
}
