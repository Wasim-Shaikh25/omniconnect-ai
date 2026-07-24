import { prisma } from "@/shared/database";
import type {
  MessageRecord,
  MessageRepository,
  MessageSender,
} from "../application/ports";

type PrismaMessage = {
  id: string;
  conversationId: string;
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
    sender: toSender(m.sender),
    content: m.content,
    createdAt: m.createdAt,
  };
}

export class PrismaMessageRepository implements MessageRepository {
  async append(input: {
    conversationId: string;
    sender: MessageSender;
    content: string;
  }): Promise<MessageRecord> {
    const created = await prisma.message.create({
      data: {
        conversationId: input.conversationId,
        sender: input.sender,
        content: input.content,
      },
    });
    return toRecord(created);
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

  countByConversation(conversationId: string): Promise<number> {
    return prisma.message.count({ where: { conversationId } });
  }
}
