import { makeCreateStore } from "../application/create-store";
import { makeOrganizationQueries } from "../application/queries";
import { makeTenantGuard } from "../application/tenant";
import { makeBillingService } from "../application/billing";
import { PrismaOrganizationRepository } from "./organization.repository";
import { PrismaStoreRepository } from "./store.repository";
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
