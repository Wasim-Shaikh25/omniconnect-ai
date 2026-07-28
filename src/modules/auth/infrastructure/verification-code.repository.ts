import { prisma } from "@/shared/database";
import { VerificationCodeRepository } from "../application/ports";

export class PrismaVerificationCodeRepository implements VerificationCodeRepository {
  async save(identifier: string, token: string, expiresAt: Date): Promise<void> {
    await prisma.$transaction([
      prisma.verificationToken.deleteMany({ where: { identifier } }),
      prisma.verificationToken.create({
        data: { identifier, token, expires: expiresAt },
      }),
    ]);
  }

  async consume(identifier: string, token: string): Promise<boolean> {
    // Atomic delete: only succeeds for a matching, non-expired token.
    const { count } = await prisma.verificationToken.deleteMany({
      where: {
        identifier,
        token,
        expires: { gt: new Date() },
      },
    });
    return count > 0;
  }
}
