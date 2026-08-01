import { prisma } from "@/shared/database";
import { VerificationRequestRecord, VerificationRequestRepository } from "../application/ports";

export class PrismaVerificationRequestRepository implements VerificationRequestRepository {
  async save(
    request: Omit<VerificationRequestRecord, "id" | "createdAt">,
  ): Promise<VerificationRequestRecord> {
    const created = await prisma.verificationRequest.create({
      data: {
        userId: request.userId,
        channel: request.channel,
        purpose: request.purpose,
        target: request.target,
        tokenHash: request.tokenHash,
        attempts: request.attempts,
        expiresAt: request.expiresAt,
        consumedAt: request.consumedAt,
      },
    });
    return created as VerificationRequestRecord;
  }

  async findByTokenHash(tokenHash: string): Promise<VerificationRequestRecord | null> {
    const found = await prisma.verificationRequest.findUnique({ where: { tokenHash } });
    if (!found) return null;
    return found as VerificationRequestRecord;
  }

  async consume(id: string): Promise<void> {
    await prisma.verificationRequest.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async incrementAttempts(id: string): Promise<void> {
    await prisma.verificationRequest.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async countRecentByTarget(target: string, purpose: string, since: Date): Promise<number> {
    return prisma.verificationRequest.count({
      where: {
        target,
        purpose,
        consumedAt: null,
        createdAt: { gte: since },
      },
    });
  }
}
