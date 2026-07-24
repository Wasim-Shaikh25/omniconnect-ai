/**
 * Ecommerce module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/ecommerce`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: Provider-agnostic connector framework (Shopify first).
 * Public contract (to implement): EcommerceConnector interface (getProducts, getOrders, getCustomers, generateCoupon, disableCoupon, fetchDiscounts, fetchStoreInfo); ConnectorRegistry; events: StoreConnected, CouponUsed.
 */
export const MODULE_NAME = "ecommerce" as const;
