import { ecommerceQueries } from "@/modules/ecommerce";
import type { CouponInfo, CouponLookup } from "../application/ports";

export const couponLookup: CouponLookup = {
  async findById(projectId: string, id: string): Promise<CouponInfo | null> {
    const coupon = await ecommerceQueries.getCouponById(projectId, id);
    return coupon ? { id: coupon.id, code: coupon.code } : null;
  },

  async findByCode(projectId: string, code: string): Promise<CouponInfo | null> {
    const coupon = await ecommerceQueries.getCouponByCode(projectId, code);
    return coupon ? { id: coupon.id, code: coupon.code } : null;
  },

  async incrementRedemption(projectId: string, code: string, revenue: number): Promise<void> {
    await ecommerceQueries.incrementCouponUsage(projectId, code, revenue);
  },
};
