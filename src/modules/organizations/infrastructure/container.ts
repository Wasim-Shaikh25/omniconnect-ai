import { makeCreateStore } from "../application/create-store";
import { makeOrganizationQueries } from "../application/queries";
import { makeTenantGuard } from "../application/tenant";
import { makeBillingService } from "../application/billing";
import { makeCreateSaaSCoupon, makeValidateSaaSCoupon } from "../application/saas-coupon";
import { PrismaOrganizationRepository } from "./organization.repository";
import { PrismaStoreRepository } from "./store.repository";
import { PrismaSaaSCouponRepository } from "./saas-coupon.repository";
import { StripePaymentGateway } from "./stripe-payment-gateway";

const organizations = new PrismaOrganizationRepository();
const stores = new PrismaStoreRepository();

function createPaymentGateway() {
  try {
    return new StripePaymentGateway();
  } catch {
    return null;
  }
}

const paymentGateway = createPaymentGateway();
const saasCouponRepository = new PrismaSaaSCouponRepository();

/** Composition root for the organizations module. */
export const organizationRepository = organizations;
export const createStore = makeCreateStore({ organizations, stores });
export const organizationQueries = makeOrganizationQueries({
  organizations,
  stores,
});
export const tenantGuard = makeTenantGuard({ queries: organizationQueries });
export const billingService = paymentGateway
  ? makeBillingService({ organizations, paymentGateway })
  : null;
export const createSaaSCoupon = makeCreateSaaSCoupon({ coupons: saasCouponRepository });
export const validateSaaSCoupon = makeValidateSaaSCoupon({ coupons: saasCouponRepository });
export { saasCouponRepository };
