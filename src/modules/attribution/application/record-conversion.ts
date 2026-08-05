import type { ConnectorOrder } from "@/modules/ecommerce";
import type { AttributionLinkRepository, CouponLookup, ConversionEventSink } from "./ports";

export interface RecordConversion {
  (projectId: string, order: ConnectorOrder): Promise<void>;
}

export function makeRecordConversion(
  links: AttributionLinkRepository,
  coupons: CouponLookup,
  sink: ConversionEventSink,
): RecordConversion {
  return async function recordConversion(projectId, order) {
    const code = order.couponCode ?? null;
    if (!code) {
      await sink.sendPurchaseEvent(projectId, order);
      return;
    }

    const coupon = await coupons.findByCode(projectId, code);
    if (!coupon) {
      await sink.sendPurchaseEvent(projectId, order);
      return;
    }

    const link = await links.findByCoupon(coupon.id);
    if (link) {
      await links.incrementConversion(link.id, order.total ?? 0);
    }

    await coupons.incrementRedemption(projectId, coupon.code, order.total ?? 0);
    await sink.sendPurchaseEvent(projectId, order);
  };
}
