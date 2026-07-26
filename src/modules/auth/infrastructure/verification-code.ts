import { VerificationCodeRepository } from "../application/ports";
import { PrismaVerificationCodeRepository } from "./verification-code.repository";

export type VerificationPurpose = "mfa" | "reset";

function buildIdentifier(email: string, purpose: VerificationPurpose): string {
  return `${purpose}:${email.toLowerCase().trim()}`;
}

const verificationCodes: VerificationCodeRepository = new PrismaVerificationCodeRepository();

export async function verifyCode(
  email: string,
  code: string,
  purpose: VerificationPurpose,
): Promise<boolean> {
  return verificationCodes.consume(buildIdentifier(email, purpose), code);
}
