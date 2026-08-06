import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import type {
  ChatSessionRecord,
  ChatMessageRecord,
  ChatSessionRepository,
} from "../application/ports";
import type { AIToolCall } from "../domain/tools";

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
    toolCalls: safeToolCalls(row.toolCalls),
    toolCallId: row.toolCallId,
    createdAt: row.createdAt,
  };
}

function safeToolCalls(value: unknown): AIToolCall[] | null {
  if (!Array.isArray(value)) return null;
  const calls: AIToolCall[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      "id" in item &&
      typeof item.id === "string" &&
      "function" in item &&
      item.function &&
      typeof item.function === "object" &&
      "name" in item.function &&
      typeof item.function.name === "string" &&
      "arguments" in item.function &&
      typeof item.function.arguments === "string"
    ) {
      calls.push(item as AIToolCall);
    }
  }
  return calls.length > 0 ? calls : null;
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
    try {
      const row = await prisma.chatSession.update({
        where: { id },
        data: { title, updatedAt: new Date() },
      });
      return row ? toSessionRecord(row) : null;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  async delete(id: string, projectId: string): Promise<void> {
    await prisma.chatSession.delete({ where: { id, projectId } });
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
