import { createEmailSender } from "@/shared/email";
import { eventBus } from "@/shared/events";
import { smsSender } from "@/modules/notifications";
import { makeRegisterUser } from "../application/register-user";
import { makeVerificationCodeService } from "../application/verification";
import { makeEmailVerificationService } from "../application/email-verification";
import { makeChangePasswordService } from "../application/change-password";
import { makeChangeEmailService } from "../application/change-email";
import { makePhoneVerificationService } from "../application/phone-verification";
import { PrismaAccountRepository } from "./account.repository";
import { BcryptPasswordHasher } from "./password-hasher";
import { PrismaVerificationCodeRepository } from "./verification-code.repository";
import { PrismaVerificationRequestRepository } from "./verification-request.repository";
import { ensureSuperAdmin } from "./super-admin";

const accounts = new PrismaAccountRepository();
const hasher = new BcryptPasswordHasher();
const verificationCodes = new PrismaVerificationCodeRepository();
const verificationRequests = new PrismaVerificationRequestRepository();
const emailSender = createEmailSender();

/** Composition root for the auth module's use-cases. */
export const registerUser = makeRegisterUser({
  accounts,
  hasher,
  eventBus,
});

export const verificationCodeService = makeVerificationCodeService({
  repository: verificationCodes,
  emailSender,
});

export const emailVerificationService = makeEmailVerificationService({
  accounts,
  repository: verificationRequests,
  emailSender,
});

export const changePasswordService = makeChangePasswordService({
  accounts,
  hasher,
});

export const changeEmailService = makeChangeEmailService({
  accounts,
  hasher,
  emailVerification: emailVerificationService,
  emailSender,
});

export const phoneVerificationService = makePhoneVerificationService({
  accounts,
  repository: verificationRequests,
  smsSender,
});

export { accounts, hasher, ensureSuperAdmin, verificationRequests };
