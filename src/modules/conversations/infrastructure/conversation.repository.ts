import { prisma } from "@/shared/database";
import type {
  ConversationChannel,
  ConversationRecord,
  ConversationRepository,
} from "../application/ports";

type PrismaConversation = {
  id: string;
  storeId: string;
  channel: string;
  status: string;
  externalId: string | null;
  customerId: string | null;
  assignedHumanId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toChannel(channel: string): ConversationChannel {
  return channel === "FACEBOOK" ? "FACEBOOK" : "INSTAGRAM";
}

function toRecord(c: PrismaConversation): ConversationRecord {
  return {
    id: c.id,
    storeId: c.storeId,
    channel: toChannel(c.channel),
    status: c.status,
    externalId: c.externalId,
    customerId: c.customerId,
    assignedHumanId: c.assignedHumanId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export class PrismaConversationRepository implements ConversationRepository {
  async upsert(input: {
    storeId: string;
    channel: ConversationChannel;
    externalId: string | null;
    customerId?: string;
  }): Promise<ConversationRecord> {
    const existing = input.externalId
      ? await prisma.conversation.findFirst({
          where: {
            storeId: input.storeId,
            channel: input.channel,
            externalId: input.externalId,
          },
        })
      : null;

    if (existing) {
      const touched = await prisma.conversation.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() },
      });
      return toRecord(touched);
    }

    const created = await prisma.conversation.create({
      data: {
        storeId: input.storeId,
        channel: input.channel,
        externalId: input.externalId,
        customerId: input.customerId ?? null,
      },
    });
    return toRecord(created);
  }

  async listByStore(storeId: string, limit = 50): Promise<ConversationRecord[]> {
    const rows = await prisma.conversation.findMany({
      where: { storeId },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<ConversationRecord | null> {
    const found = await prisma.conversation.findUnique({ where: { id } });
    return found ? toRecord(found) : null;
  }

  async updateStatus(
    id: string,
    status: "AI_ACTIVE" | "HUMAN_ACTIVE",
  ): Promise<ConversationRecord> {
    const updated = await prisma.conversation.update({
      where: { id },
      data: { status },
    });
    return toRecord(updated);
  }

  async takeOver(input: {
    id: string;
    humanUserId: string;
  }): Promise<ConversationRecord> {
    const updated = await prisma.conversation.update({
      where: { id: input.id },
      data: {
        status: "HUMAN_ACTIVE",
        assignedHumanId: input.humanUserId,
      },
    });
    return toRecord(updated);
  }

  async resumeAI(id: string): Promise<ConversationRecord> {
    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        status: "AI_ACTIVE",
        assignedHumanId: null,
      },
    });
    return toRecord(updated);
  }
}
