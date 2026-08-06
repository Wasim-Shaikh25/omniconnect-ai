import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import type {
  ChatSessionRecord,
  ChatMessageRecord,
  ChatSessionRepository,
} from "../application/ports";

function toMessageRecord(row: {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  toolCalls: unknown;
  toolCallId: string | null;
  createdAt: Date;
}): ChatMessageRecord {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role as ChatMessageRecord["role"],
    content: row.content,
    toolCalls:
      typeof row.toolCalls === "object" && row.toolCalls !== null
        ? (row.toolCalls as Record<string, unknown>)
        : null,
    toolCallId: row.toolCallId,
    createdAt: row.createdAt,
  };
}

function toSessionRecord(row: {
  id: string;
  projectId: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ChatSessionRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaChatSessionRepository implements ChatSessionRepository {
  async create(input: {
    projectId: string;
    userId: string;
    title?: string;
  }): Promise<ChatSessionRecord> {
    const row = await prisma.chatSession.create({
      data: {
        projectId: input.projectId,
        userId: input.userId,
        title: input.title ?? null,
      },
    });
    return toSessionRecord(row);
  }

  async findById(
    id: string,
  ): Promise<(ChatSessionRecord & { messages: ChatMessageRecord[] }) | null> {
    const row = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!row) return null;
    return {
      ...toSessionRecord(row),
      messages: row.messages.map(toMessageRecord),
    };
  }

  async listByProject(
    projectId: string,
    limit = 50,
  ): Promise<ChatSessionRecord[]> {
    const rows = await prisma.chatSession.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return rows.map(toSessionRecord);
  }

  async updateTitle(id: string, title: string): Promise<ChatSessionRecord | null> {
    const row = await prisma.chatSession.update({
      where: { id },
      data: { title, updatedAt: new Date() },
    });
    return row ? toSessionRecord(row) : null;
  }

  async delete(id: string): Promise<void> {
    await prisma.chatSession.delete({ where: { id } });
  }

  async addMessage(
    input: Omit<ChatMessageRecord, "id" | "createdAt">,
  ): Promise<ChatMessageRecord> {
    const row = await prisma.chatMessage.create({
      data: {
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        toolCalls: input.toolCalls
          ? (input.toolCalls as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        toolCallId: input.toolCallId ?? null,
      },
    });
    return toMessageRecord(row);
  }
}
