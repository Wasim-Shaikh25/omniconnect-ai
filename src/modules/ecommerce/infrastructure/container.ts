import { makeConnectStore } from "../application/connect-store";
import { makeSyncProducts } from "../application/sync-products";
import { makeSyncOrders } from "../application/sync-orders";
import { makeApplyShopifyWebhook } from "../application/apply-shopify-webhook";
import { makeGenerateCoupon } from "../application/generate-coupon";
import { makeUpdateProduct } from "../application/update-product";
import { makeDeleteProduct } from "../application/delete-product";
import { makeUpdateCoupon } from "../application/update-coupon";
import { makeDeleteCoupon } from "../application/delete-coupon";
import { makeEcommerceQueries } from "../application/queries";
import { makeDetectCommerceInsights } from "../application/detect-insights";
import { PrismaIntegrationRepository } from "./integration.repository";
import { PrismaProductRepository } from "./product.repository";
import { PrismaCouponRepository } from "./coupon.repository";
import { PrismaOrderRepository } from "./order.repository";
import { IntegrationConnectorFactory } from "./connector.factory";

const integrations = new PrismaIntegrationRepository();
const products = new PrismaProductRepository();
const coupons = new PrismaCouponRepository();
const orders = new PrismaOrderRepository();
const connectors = new IntegrationConnectorFactory(integrations);

/** Composition root for the ecommerce module. */
export const connectStore = makeConnectStore({ integrations });
export const syncProducts = makeSyncProducts({ connectors, products });
export const syncOrders = makeSyncOrders({ connectors, orders });
export const applyShopifyWebhook = makeApplyShopifyWebhook({ integrations, products, orders });
export const generateCoupon = makeGenerateCoupon({ connectors, coupons });
export const updateProduct = makeUpdateProduct({ products });
export const deleteProduct = makeDeleteProduct({ products });
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
