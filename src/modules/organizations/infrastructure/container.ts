import { makeCreateStore } from "../application/create-store";
import { makeOrganizationQueries } from "../application/queries";
import {
  makeUpdateStore,
  makeArchiveStore,
  makeRestoreStore,
  makeDeleteStore,
} from "../application/store-lifecycle";
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
import { StripePaymentGateway } from "./stripe-payment-gateway";
import { setUserOrganization } from "@/modules/users";
import { createEmailSender } from "@/shared/email";
import { env } from "@/shared/config";

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
const emailSender = createEmailSender();

function generateInviteToken(): string {
  return crypto.randomUUID();
}

function sendInviteEmail(input: {
  email: string;
  token: string;
  organizationName: string;
  storeId?: string;
}): Promise<void> {
  const storeParam = input.storeId
    ? `&storeId=${encodeURIComponent(input.storeId)}`
    : "";
  const link = `${env.APP_URL}/register?inviteToken=${encodeURIComponent(input.token)}${storeParam}`;
  const text = `You have been invited to join ${input.organizationName} on OmniConnect AI.\n\nAccept the invite:\n${link}\n\nThis link expires in 7 days.`;
  const html = `<p>You have been invited to join <strong>${input.organizationName}</strong> on OmniConnect AI.</p><p><a href="${link}">Accept the invite</a></p><p>This link expires in 7 days.</p>`;
  return emailSender.send(input.email, `Invite to ${input.organizationName}`, text, html);
}

/** Composition root for the organizations module. */
export const organizationRepository = organizations;
export const createOrganization = makeCreateOrganization({
  organizations,
  setUserOrganization,
});
export const createStore = makeCreateStore({ organizations, stores });
export const updateStore = makeUpdateStore({ stores });
export const archiveStore = makeArchiveStore({ stores });
export const restoreStore = makeRestoreStore({ stores });
export const deleteStore = makeDeleteStore({ stores });
export const organizationQueries = makeOrganizationQueries({
  organizations,
  stores,
  invites: inviteRepository,
});
export const organizationUsage = makeOrganizationUsageService({ organizations });
export const tenantGuard = makeTenantGuard({ queries: organizationQueries });
export const billingService = paymentGateway
  ? makeBillingService({ organizations, paymentGateway, coupons: saasCouponRepository })
  : null;
export const createSaaSCoupon = makeCreateSaaSCoupon({ coupons: saasCouponRepository });
export const validateSaaSCoupon = makeValidateSaaSCoupon({ coupons: saasCouponRepository });
export { saasCouponRepository };

export const inviteMember = makeInviteMember({
  organizations,
  invites: inviteRepository,
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


