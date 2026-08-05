import { prisma } from "@/shared/database";
import type {
  ConversationChannel,
  ConversationRecord,
  ConversationRepository,
} from "../application/ports";

type PrismaConversation = {
  id: string;
  projectId: string;
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
    projectId: c.projectId,
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
    projectId: string;
    channel: ConversationChannel;
    externalId: string | null;
    customerId?: string;
  }): Promise<ConversationRecord> {
    const existing = input.externalId
      ? await prisma.conversation.findFirst({
          where: {
            projectId: input.projectId,
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
        projectId: input.projectId,
        channel: input.channel,
        externalId: input.externalId,
        customerId: input.customerId ?? null,
      },
    });
    return toRecord(created);
  }

  async listByStore(
    projectId: string,
    options: { limit?: number; offset?: number; search?: string } = {},
  ): Promise<ConversationRecord[]> {
    const where: { projectId: string; externalId?: { contains: string; mode: "insensitive" } } = { projectId };
    if (options.search) {
      where.externalId = { contains: options.search, mode: "insensitive" };
    }
    const rows = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: options.offset ?? 0,
      take: options.limit ?? 50,
    });
    return rows.map(toRecord);
  }

  async countByStore(
    projectId: string,
    options: { search?: string } = {},
  ): Promise<number> {
    const where: { projectId: string; externalId?: { contains: string; mode: "insensitive" } } = { projectId };
    if (options.search) {
      where.externalId = { contains: options.search, mode: "insensitive" };
    }
    return prisma.conversation.count({ where });
  }

  async listByStoreIds(
    storeIds: string[],
    limit = 100,
  ): Promise<ConversationRecord[]> {
    const rows = await prisma.conversation.findMany({
      where: { projectId: { in: storeIds } },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async findById(id: string, projectId?: string): Promise<ConversationRecord | null> {
    const found = await prisma.conversation.findUnique({
      where: projectId ? { id, projectId } : { id },
    });
    return found ? toRecord(found) : null;
  }

  async updateStatus(
    id: string,
    projectId: string,
    status: "AI_ACTIVE" | "HUMAN_ACTIVE",
  ): Promise<ConversationRecord> {
    const updated = await prisma.conversation.update({
      where: { id, projectId },
      data: { status },
    });
    return toRecord(updated);
  }

  async takeOver(input: {
    id: string;
    projectId: string;
    humanUserId: string;
  }): Promise<ConversationRecord> {
    const updated = await prisma.conversation.update({
      where: { id: input.id, projectId: input.projectId },
      data: {
        status: "HUMAN_ACTIVE",
        assignedHumanId: input.humanUserId,
      },
    });
    return toRecord(updated);
  }

  async resumeAI(id: string, projectId: string): Promise<ConversationRecord> {
    const updated = await prisma.conversation.update({
      where: { id, projectId },
      data: {
        status: "AI_ACTIVE",
        assignedHumanId: null,
      },
    });
    return toRecord(updated);
  }
}
