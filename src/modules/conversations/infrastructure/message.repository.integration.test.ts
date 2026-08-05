import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/shared/database";
import { PrismaMessageRepository } from "./message.repository";

const repository = new PrismaMessageRepository();

describe("PrismaMessageRepository.listLatestByConversationIds (M4)", () => {
  let organizationId: string;
  let storeId: string;
  const conversationIds: string[] = [];

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: "Message Query Test Org" },
    });
    organizationId = org.id;

    const store = await prisma.store.create({
      data: {
        name: "Test Store",
        domain: "message-query-test.example.com",
        organizationId,
      },
    });
    storeId = store.id;

    for (let i = 0; i < 3; i += 1) {
      const conversation = await prisma.conversation.create({
        data: { storeId, channel: "INSTAGRAM" },
      });
      conversationIds.push(conversation.id);

      for (let j = 0; j < 50; j += 1) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            sender: j % 2 === 0 ? "CUSTOMER" : "AI",
            content: `message-${j}`,
            createdAt: new Date(Date.now() - j * 1000),
          },
        });
      }
    }
  });

  afterAll(async () => {
    await prisma.message.deleteMany({
      where: { conversationId: { in: conversationIds } },
    });
    await prisma.conversation.deleteMany({
      where: { id: { in: conversationIds } },
    });
    await prisma.store.deleteMany({ where: { id: storeId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  });

  it("returns exactly one latest message per conversation (3 rows for 3 conversations)", async () => {
    const latest = await repository.listLatestByConversationIds(conversationIds);

    expect(Object.keys(latest).length).toBe(3);
    for (const conversationId of conversationIds) {
      expect(latest[conversationId]).toBeDefined();
      expect(latest[conversationId].content).toBe("message-0");
      expect(latest[conversationId].conversationId).toBe(conversationId);
    }
  });
});
