import { z } from "zod";
import type { CouponRepository } from "./ports";

export const deleteCouponSchema = z.object({
  couponId: z.string().min(1),
  storeId: z.string().min(1),
});

export type DeleteCouponInput = z.infer<typeof deleteCouponSchema>;

export function makeDeleteCoupon(deps: { coupons: CouponRepository }) {
  return async function deleteCoupon(input: DeleteCouponInput) {
    const coupon = await deps.coupons.findById(input.couponId);
    if (!coupon) {
      throw new Error("Coupon not found.");
    }
    if (coupon.storeId !== input.storeId) {
      throw new Error("Coupon does not belong to this store.");
    }

    return deps.coupons.delete(input.couponId);
  };
}
