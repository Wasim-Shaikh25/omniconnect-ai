import { makeConnectStore } from "../application/connect-store";
import { makeSyncProducts } from "../application/sync-products";
import { makeGenerateCoupon } from "../application/generate-coupon";
import { makeEcommerceQueries } from "../application/queries";
import { PrismaIntegrationRepository } from "./integration.repository";
import { PrismaProductRepository } from "./product.repository";
import { PrismaCouponRepository } from "./coupon.repository";
import { IntegrationConnectorFactory } from "./connector.factory";

const integrations = new PrismaIntegrationRepository();
const products = new PrismaProductRepository();
const coupons = new PrismaCouponRepository();
const connectors = new IntegrationConnectorFactory(integrations);

/** Composition root for the ecommerce module. */
export const connectStore = makeConnectStore({ integrations });
export const syncProducts = makeSyncProducts({ connectors, products });
export const generateCoupon = makeGenerateCoupon({ connectors, coupons });
export const ecommerceQueries = makeEcommerceQueries({
  integrations,
  products,
  coupons,
});
