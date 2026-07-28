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
    const record = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token } },
    });
    if (!record) return false;
    if (record.expires < new Date()) return false;
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier, token } },
    });
    return true;
  }
}
