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
export type {
  AdapterConfigMapping,
  AuthType,
  CredentialField,
  EndpointMapping,
  PaginationConfig,
} from "./domain/adapter-config";
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
  OrderSynced,
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
  AbandonedCartDetectedPayload,
  OrderSyncedPayload,
} from "./domain/events";

// Application — schemas + record types
export { connectStoreSchema } from "./application/connect-store";
export type { ConnectStoreInput } from "./application/connect-store";
export { generateCouponSchema } from "./application/generate-coupon";
export type { GenerateCouponInput } from "./application/generate-coupon";
export { syncOrdersSchema } from "./application/sync-orders";
export { updateCouponSchema } from "./application/update-coupon";
export type { UpdateCouponInput } from "./application/update-coupon";
export { deleteCouponSchema } from "./application/delete-coupon";
export type { DeleteCouponInput } from "./application/delete-coupon";
export type {
  IntegrationRecord,
  ProductRecord,
  CouponRecord,
  OrderRecord,
  CartRecord,
} from "./application/ports";
export type { EcommerceQueries, StoreConnectionView } from "./application/queries";
export type { DetectCommerceInsights } from "./application/detect-insights";
export type { ActionResult } from "./application/action-handlers";
export { executeEcommerceAction } from "./application/action-handlers";

// Provider registry (implement-and-register to add providers)
export { getConnector } from "./infrastructure/provider-registry";
export {
  ConfigInterpreter,
  ConfigInterpreterNotImplementedError,
} from "./infrastructure/config-interpreter";

// Use-cases + queries (composed)
export {
  connectStore,
  syncProducts,
  syncOrders,
  applyShopifyWebhook,
  generateCoupon,
  updateCoupon,
  deleteCoupon,
  ecommerceQueries,
  detectCommerceInsights,
  abandonedCartSweep,
  adapterLibrary,
} from "./infrastructure/container";
export type { AdapterLibraryService, AdapterValidationResult } from "./application/adapter-library";

// Presentation
export {
  connectStoreAction,
  syncProductsAction,
  syncOrdersAction,
  generateCouponAction,
  updateCouponAction,
  deleteCouponAction,
  bulkDeleteCouponsAction,
} from "./presentation/actions";
export type { EcommerceActionState } from "./presentation/actions";
export {
  listAdaptersAction,
  toggleAdapterAction,
  validateAdapterAction,
} from "./presentation/adapter-library.actions";
export type { AdapterLibraryActionState } from "./presentation/adapter-library.actions";
