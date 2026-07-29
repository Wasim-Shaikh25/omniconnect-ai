import { z } from "zod";
import type { CouponRepository } from "./ports";

export const updateCouponSchema = z.object({
  couponId: z.string().min(1),
  storeId: z.string().min(1),
  discountPct: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(["ACTIVE", "DISABLED", "EXPIRED"]).optional(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

export function makeUpdateCoupon(deps: { coupons: CouponRepository }) {
  return async function updateCoupon(input: UpdateCouponInput) {
    const coupon = await deps.coupons.findById(input.couponId);
    if (!coupon) {
      throw new Error("Coupon not found.");
    }
    if (coupon.storeId !== input.storeId) {
      throw new Error("Coupon does not belong to this store.");
    }

    return deps.coupons.update(input.couponId, {
      discountPct: input.discountPct,
      status: input.status,
      expiresAt: input.expiresAt,
    });
  };
}
