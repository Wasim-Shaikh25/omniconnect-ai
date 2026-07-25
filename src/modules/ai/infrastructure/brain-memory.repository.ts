import { prisma } from "@/shared/database";
import type { BrainConversationMemoryRecord, BrainMemoryRepository } from "../application/ports";

function toRecord(row: {
  id: string;
  userId: string;
  organizationId: string;
  storeId: string | null;
  question: string;
  answer: string;
  acceptedAdviceIds: string[];
  rejectedAdviceIds: string[];
  goals: string[];
  createdAt: Date;
  updatedAt: Date;
}): BrainConversationMemoryRecord {
  return {
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    storeId: row.storeId,
    question: row.question,
    answer: row.answer,
    acceptedAdviceIds: row.acceptedAdviceIds,
    rejectedAdviceIds: row.rejectedAdviceIds,
    goals: row.goals,
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
    organizationId: string,
    storeId?: string,
    limit = 10,
  ): Promise<BrainConversationMemoryRecord[]> {
    const rows = await prisma.brainConversationMemory.findMany({
      where: {
        userId,
        organizationId,
        ...(storeId ? { storeId } : {}),
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
}
