import { makeCreateStore } from "../application/create-store";
import { makeOrganizationQueries } from "../application/queries";
import { makeTenantGuard } from "../application/tenant";
import { makeOrganizationUsageService } from "../application/usage";
import { makeBillingService } from "../application/billing";
import { makeCreateSaaSCoupon, makeValidateSaaSCoupon } from "../application/saas-coupon";
import {
  makeCreateProject,
  makeListProjects,
  makeArchiveProject,
  makeAddProjectMember,
  makeRemoveProjectMember,
  makeListProjectMembers,
} from "../application/project";
import { PrismaOrganizationRepository } from "./organization.repository";
import { PrismaStoreRepository } from "./store.repository";
import { PrismaSaaSCouponRepository } from "./saas-coupon.repository";
import { PrismaProjectRepository } from "./project.repository";
import { StripePaymentGateway } from "./stripe-payment-gateway";

const organizations = new PrismaOrganizationRepository();
const stores = new PrismaStoreRepository();
const projects = new PrismaProjectRepository();

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
export const organizationUsage = makeOrganizationUsageService({ organizations });
export const tenantGuard = makeTenantGuard({ queries: organizationQueries });
export const billingService = paymentGateway
  ? makeBillingService({ organizations, paymentGateway, coupons: saasCouponRepository })
  : null;
export const createSaaSCoupon = makeCreateSaaSCoupon({ coupons: saasCouponRepository });
export const validateSaaSCoupon = makeValidateSaaSCoupon({ coupons: saasCouponRepository });
export { saasCouponRepository };

export { projects };
export const createProject = makeCreateProject({ projects });
export const listProjects = makeListProjects({ projects });
export const archiveProject = makeArchiveProject({ projects });
export const addProjectMember = makeAddProjectMember({ projects });
export const removeProjectMember = makeRemoveProjectMember({ projects });
export const listProjectMembers = makeListProjectMembers({ projects });
