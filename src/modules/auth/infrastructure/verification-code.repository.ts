import { prisma } from "@/shared/database";
import { VerificationCodeRepository } from "../application/ports";

function parsePurpose(identifier: string): { purpose: "mfa" | "reset"; email: string } {
  const [prefix, ...rest] = identifier.split(":");
  const email = rest.join(":");
  if (prefix === "mfa" || prefix === "reset") {
    return { purpose: prefix, email };
  }
  // Fallback: treat unknown identifiers as password reset to avoid breaking callers.
  return { purpose: "reset", email: identifier };
}

export class PrismaVerificationCodeRepository implements VerificationCodeRepository {
  async save(identifier: string, token: string, expiresAt: Date): Promise<void> {
    const { purpose, email } = parsePurpose(identifier);
    const data = { email, code: token, expiresAt };
    if (purpose === "mfa") {
      await prisma.$transaction([
        prisma.mfaCode.deleteMany({ where: { email } }),
        prisma.mfaCode.create({ data }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.passwordResetCode.deleteMany({ where: { email } }),
        prisma.passwordResetCode.create({ data }),
      ]);
    }
  }

  async consume(identifier: string, token: string): Promise<boolean> {
    const { purpose, email } = parsePurpose(identifier);
    const where = { email, code: token, expiresAt: { gt: new Date() } };
    if (purpose === "mfa") {
      const { count } = await prisma.mfaCode.deleteMany({ where });
      return count > 0;
    }
    const { count } = await prisma.passwordResetCode.deleteMany({ where });
    return count > 0;
  }
}
