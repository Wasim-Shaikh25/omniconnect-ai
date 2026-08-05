import { prisma } from "@/shared/database";
import type { BrainConversationMemoryRecord, BrainMemoryRepository } from "../application/ports";

function toRecord(row: {
  id: string;
  userId: string;
  userId: string;
  projectId: string | null;
  question: string;
  answer: string;
  acceptedAdviceIds: string[];
  rejectedAdviceIds: string[];
  goals: string[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): BrainConversationMemoryRecord {
  return {
    id: row.id,
    userId: row.userId,
    userId: row.userId,
    projectId: row.projectId,
    question: row.question,
    answer: row.answer,
    acceptedAdviceIds: row.acceptedAdviceIds,
    rejectedAdviceIds: row.rejectedAdviceIds,
    goals: row.goals,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaBrainMemoryRepository implements BrainMemoryRepository {
  async save(entry: Omit<BrainConversationMemoryRecord, "id" | "createdAt" | "updatedAt">): Promise<BrainConversationMemoryRecord> {
    const created = await prisma.brainConversationMemory.create({ data: entry });
    return toRecord(created);
  }

  async listRecent(
    userId: string,
    userId: string,
    projectId?: string,
    limit = 10,
  ): Promise<BrainConversationMemoryRecord[]> {
    const rows = await prisma.brainConversationMemory.findMany({
      where: {
        userId,
        userId,
        ...(projectId ? { projectId } : {}),
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async updateFeedback(
    id: string,
    acceptedAdviceIds: string[],
    rejectedAdviceIds: string[],
    goals: string[],
  ): Promise<BrainConversationMemoryRecord> {
    const updated = await prisma.brainConversationMemory.update({
      where: { id },
      data: { acceptedAdviceIds, rejectedAdviceIds, goals },
    });
    return toRecord(updated);
  }

  async purgeExpiredBefore(before: Date): Promise<number> {
    const result = await prisma.brainConversationMemory.deleteMany({
      where: { expiresAt: { lt: before } },
    });
    return result.count;
  }
}
