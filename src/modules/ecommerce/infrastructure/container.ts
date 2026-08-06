import { makeConnectStore } from "../application/connect-store";
import { makeSyncProducts } from "../application/sync-products";
import { makeSyncOrders } from "../application/sync-orders";
import { makeApplyShopifyWebhook } from "../application/apply-shopify-webhook";
import { makeGenerateCoupon } from "../application/generate-coupon";
import { makeUpdateCoupon } from "../application/update-coupon";
import { makeDeleteCoupon } from "../application/delete-coupon";
import { makeEcommerceQueries } from "../application/queries";
import { makeDetectCommerceInsights } from "../application/detect-insights";
import { makeAbandonedCartSweep } from "../application/abandoned-cart-sweep";
import { makeAdapterLibraryService } from "../application/adapter-library";
import { eventBus } from "@/shared/events";
import { auditCommands } from "@/modules/users";
import { PrismaIntegrationRepository } from "./integration.repository";
import { PrismaProductRepository } from "./product.repository";
import { PrismaCouponRepository } from "./coupon.repository";
import { PrismaOrderRepository } from "./order.repository";
import { PrismaCartRepository } from "./cart.repository";
import { IntegrationConnectorFactory } from "./connector.factory";
import { PrismaProcessedEventsRepository } from "@/shared/webhooks/processed-events.repository";
import { PrismaShopifyComplianceRepository } from "./shopify-compliance.repository";

const integrations = new PrismaIntegrationRepository();
const processedEvents = new PrismaProcessedEventsRepository();
const products = new PrismaProductRepository();
const coupons = new PrismaCouponRepository();
const orders = new PrismaOrderRepository();
const carts = new PrismaCartRepository();
const connectors = new IntegrationConnectorFactory(integrations);
const compliance = new PrismaShopifyComplianceRepository();

/** Composition root for the ecommerce module. */
export const connectStore = makeConnectStore({ integrations });
export const syncProducts = makeSyncProducts({ connectors, products });
export const syncOrders = makeSyncOrders({ connectors, orders, eventBus });
export const applyShopifyWebhook = makeApplyShopifyWebhook({
  integrations,
  products,
  orders,
  carts,
  processedEvents,
  compliance,
  auditLog: auditCommands,
  eventBus,
});
export const generateCoupon = makeGenerateCoupon({ connectors, coupons });
export const updateCoupon = makeUpdateCoupon({ coupons });
export const deleteCoupon = makeDeleteCoupon({ coupons });
export const ecommerceQueries = makeEcommerceQueries({
  integrations,
  products,
  coupons,
  orders,
  connectors,
});
export const detectCommerceInsights = makeDetectCommerceInsights({ ecommerce: ecommerceQueries });
export const abandonedCartSweep = makeAbandonedCartSweep({ carts, eventBus });
export const adapterLibrary = makeAdapterLibraryService({ integrations, connectorResolver: connectors });
