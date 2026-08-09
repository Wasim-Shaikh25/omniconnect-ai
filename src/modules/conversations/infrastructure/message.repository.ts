import { prisma } from "@/shared/database";
import type {
  MessageRecord,
  MessageRepository,
  MessageSender,
} from "../application/ports";

type PrismaMessage = {
  id: string;
  conversationId: string;
  inReplyToMessageId: string | null;
  sender: string;
  content: string;
  createdAt: Date;
};

function toSender(sender: string): MessageSender {
  if (sender === "AI") return "AI";
  if (sender === "HUMAN") return "HUMAN";
  return "CUSTOMER";
}

function toRecord(m: PrismaMessage): MessageRecord {
  return {
    id: m.id,
    conversationId: m.conversationId,
    inReplyToMessageId: m.inReplyToMessageId,
    sender: toSender(m.sender),
    content: m.content,
    createdAt: m.createdAt,
  };
}

export class PrismaMessageRepository implements MessageRepository {
  async append(input: {
    conversationId: string;
    projectId: string;
    sender: MessageSender;
    content: string;
    inReplyToMessageId?: string | null;
  }): Promise<MessageRecord> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: input.conversationId, projectId: input.projectId },
    });
    if (!conversation) throw new Error("Conversation not found");

    const created = await prisma.message.create({
      data: {
        conversationId: input.conversationId,
        inReplyToMessageId: input.inReplyToMessageId ?? null,
        sender: input.sender,
        content: input.content,
      },
    });
    return toRecord(created);
  }

  async findByInReplyToMessageId(
    inReplyToMessageId: string,
  ): Promise<MessageRecord | null> {
    const row = await prisma.message.findFirst({
      where: { inReplyToMessageId },
    });
    return row ? toRecord(row) : null;
  }

  async listByConversation(
    conversationId: string,
    limit = 100,
  ): Promise<MessageRecord[]> {
    const rows = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async listLatestByConversationIds(
    conversationIds: string[],
  ): Promise<Record<string, MessageRecord>> {
    if (conversationIds.length === 0) return {};
    const limit = conversationIds.length;
    const rows = await prisma.$queryRaw<PrismaMessage[]>`
      SELECT DISTINCT ON ("conversationId") *
      FROM "Message"
      WHERE "conversationId" = ANY(${conversationIds}::text[])
      ORDER BY "conversationId", "createdAt" DESC
      LIMIT ${limit}
    `;
    const latest: Record<string, MessageRecord> = {};
    for (const row of rows) {
      latest[row.conversationId] = toRecord(row);
    }
    return latest;
  }

  countByConversation(conversationId: string): Promise<number> {
    return prisma.message.count({ where: { conversationId } });
  }
}
