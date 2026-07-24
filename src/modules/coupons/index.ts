/**
 * Coupons module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/coupons`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: Coupon lifecycle & personalized generation.
 * Public contract (to implement): CouponService (generateForCustomer, disable, verifyUsage); events: CouponGenerated, CouponDisabled.
 */
export const MODULE_NAME = "coupons" as const;
