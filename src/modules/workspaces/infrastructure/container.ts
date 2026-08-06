import { makeCreateStore } from "../application/create-store";
import { makeOrganizationQueries } from "../application/queries";
import { makeUpdateStore } from "../application/store-lifecycle";
import { makeTenantGuard } from "../application/tenant";
import { makeOrganizationUsageService } from "../application/usage";
import { makeBillingService } from "../application/billing";
import { makeCreateSaaSCoupon, makeValidateSaaSCoupon } from "../application/saas-coupon";
import { makeInviteMember } from "../application/invite-member";
import { makeRevokeInvite } from "../application/revoke-invite";
import { makeResendInvite } from "../application/resend-invite";
import { makeCreateOrganization } from "../application/create-organization";
import {
  makeValidateInvite,
  makeAcceptInvite,
} from "../application/validate-accept-invite";
import { PrismaOrganizationRepository } from "./organization.repository";
import { PrismaStoreRepository } from "./store.repository";
import { PrismaSaaSCouponRepository } from "./saas-coupon.repository";
import { PrismaOrganizationInviteRepository } from "./organization-invite.repository";
import { PrismaPlanConfigRepository } from "./plan-config.repository";
import { StripePaymentGateway } from "./stripe-payment-gateway";
import { makePlanConfigService } from "../application/plan-config";
import { setUserOrganization } from "@/modules/users";
import { createEmailSender } from "@/shared/email";
import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import { PrismaProcessedEventsRepository } from "@/shared/webhooks/processed-events.repository";

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
const inviteRepository = new PrismaOrganizationInviteRepository();
const planConfigRepository = new PrismaPlanConfigRepository();
const processedEvents = new PrismaProcessedEventsRepository();
const emailSender = createEmailSender();

function generateInviteToken(): string {
  return crypto.randomUUID();
}

async function sendInviteEmail(input: {
  email: string;
  token: string;
  organizationName: string;
  projectId?: string;
}): Promise<void> {
  const storeParam = input.projectId
    ? `&projectId=${encodeURIComponent(input.projectId)}`
    : "";
  const link = `${env.APP_URL}/register?inviteToken=${encodeURIComponent(input.token)}${storeParam}`;
  const text = `You have been invited to join ${input.organizationName} on OmniConnect AI.\n\nAccept the invite:\n${link}\n\nThis link expires in 7 days.`;
  const html = `<p>You have been invited to join <strong>${input.organizationName}</strong> on OmniConnect AI.</p><p><a href="${link}">Accept the invite</a></p><p>This link expires in 7 days.</p>`;
  try {
    await emailSender.send(input.email, `Invite to ${input.organizationName}`, text, html);
  } catch (error) {
    // Email delivery is best-effort. The invite is already persisted; a retry
    // or resend can recover from a transient provider outage.
    logger.error("workspaces.inviteEmailFailed", {
      error: error instanceof Error ? error.message : String(error),
      email: input.email,
    });
  }
}

/** Composition root for the organizations module. */
export const organizationRepository = organizations;
export const createOrganization = makeCreateOrganization({
  organizations,
  setUserOrganization,
});
export const createStore = makeCreateStore({ organizations, stores, planConfigs: planConfigRepository });
export const updateStore = makeUpdateStore({ stores });
export const organizationQueries = makeOrganizationQueries({
  organizations,
  stores,
  invites: inviteRepository,
});
export const organizationUsage = makeOrganizationUsageService({ organizations, planConfigs: planConfigRepository });
export const tenantGuard = makeTenantGuard({ queries: organizationQueries });
export const billingService = paymentGateway
  ? makeBillingService({ organizations, paymentGateway, coupons: saasCouponRepository, processedEvents })
  : null;
export const createSaaSCoupon = makeCreateSaaSCoupon({ coupons: saasCouponRepository });
export const validateSaaSCoupon = makeValidateSaaSCoupon({ coupons: saasCouponRepository });
export { saasCouponRepository };

export const inviteMember = makeInviteMember({
  organizations,
  invites: inviteRepository,
  planConfigs: planConfigRepository,
  sendInviteEmail,
  generateToken: generateInviteToken,
  now: () => new Date(),
});
export const revokeInvite = makeRevokeInvite({ invites: inviteRepository });
export const resendInvite = makeResendInvite({
  invites: inviteRepository,
  organizations,
  sendInviteEmail,
  generateToken: generateInviteToken,
  now: () => new Date(),
});
export const validateOrganizationInvite = makeValidateInvite({
  invites: inviteRepository,
  now: () => new Date(),
});
export const acceptOrganizationInvite = makeAcceptInvite({
  invites: inviteRepository,
  now: () => new Date(),
});

export const planConfigService = makePlanConfigService({ planConfigs: planConfigRepository });


