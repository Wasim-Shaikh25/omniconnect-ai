/**
 * Ecommerce module — public barrel.
 *
 * The ONLY entry point other modules may import from `@/modules/ecommerce`.
 * Provider-agnostic connector framework (Shopify + Mock). Owns Integration /
 * Product / Coupon persistence. Exposes the connector contract, provider
 * registry, use-cases, queries, events, and RBAC-gated server actions.
 */
export const MODULE_NAME = "ecommerce" as const;

// Domain — connector contract + DTOs
export type {
  EcommerceConnector,
  ConnectorCredentials,
  ConnectorProduct,
  ConnectorOrder,
  ConnectorCustomer,
  ConnectorDiscount,
  ConnectorCoupon,
  StoreInfo,
} from "./domain/connector";
export {
  EcommerceError,
  ProviderNotSupportedError,
  StoreNotFoundError,
  StoreNotConnectedError,
  ConnectorError,
} from "./domain/errors";
export {
  StoreConnected,
  ProductsSynced,
  CouponGenerated,
  CouponDisabled,
  CommerceInsightGenerated,
  CommerceRecommendationGenerated,
  AbandonedCartDetected,
} from "./domain/events";
export type {
  StoreConnectedPayload,
  ProductInventorySnapshot,
  ProductsSyncedPayload,
  CouponGeneratedPayload,
  CouponDisabledPayload,
  CommerceInsight,
  CommerceRecommendation,
  CommerceInsightGeneratedPayload,
  CommerceRecommendationGeneratedPayload,
} from "./domain/events";

// Application — schemas + record types
export { connectStoreSchema } from "./application/connect-store";
export type { ConnectStoreInput } from "./application/connect-store";
export { generateCouponSchema } from "./application/generate-coupon";
export type { GenerateCouponInput } from "./application/generate-coupon";
export { syncOrdersSchema } from "./application/sync-orders";
export { updateProductSchema } from "./application/update-product";
export type { UpdateProductInput } from "./application/update-product";
export { deleteProductSchema } from "./application/delete-product";
export type { DeleteProductInput } from "./application/delete-product";
export { updateCouponSchema } from "./application/update-coupon";
export type { UpdateCouponInput } from "./application/update-coupon";
export { deleteCouponSchema } from "./application/delete-coupon";
export type { DeleteCouponInput } from "./application/delete-coupon";
export type {
  IntegrationRecord,
  ProductRecord,
  CouponRecord,
  OrderRecord,
} from "./application/ports";
export type { EcommerceQueries, StoreConnectionView } from "./application/queries";
export type { DetectCommerceInsights } from "./application/detect-insights";
export type { ActionResult } from "./application/action-handlers";
export { executeEcommerceAction } from "./application/action-handlers";

// Provider registry (implement-and-register to add providers)
export { getConnector } from "./infrastructure/provider-registry";

// Use-cases + queries (composed)
export {
  connectStore,
  syncProducts,
  syncOrders,
  applyShopifyWebhook,
  generateCoupon,
  updateProduct,
  deleteProduct,
  updateCoupon,
  deleteCoupon,
  ecommerceQueries,
  detectCommerceInsights,
} from "./infrastructure/container";

// Presentation
export {
  connectStoreAction,
  syncProductsAction,
  syncOrdersAction,
  generateCouponAction,
  updateProductAction,
  deleteProductAction,
  bulkDeleteProductsAction,
  updateCouponAction,
  deleteCouponAction,
  bulkDeleteCouponsAction,
} from "./presentation/actions";
export type { EcommerceActionState } from "./presentation/actions";
