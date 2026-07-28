import { createEmailSender } from "@/shared/email";
import { eventBus } from "@/shared/events";
import { makeRegisterUser } from "../application/register-user";
import { makeVerificationCodeService } from "../application/verification";
import { PrismaAccountRepository } from "./account.repository";
import { BcryptPasswordHasher } from "./password-hasher";
import { PrismaVerificationCodeRepository } from "./verification-code.repository";
import { ensureSuperAdmin } from "./super-admin";

const accounts = new PrismaAccountRepository();
const hasher = new BcryptPasswordHasher();
const verificationCodes = new PrismaVerificationCodeRepository();
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

export { accounts, hasher, ensureSuperAdmin };
