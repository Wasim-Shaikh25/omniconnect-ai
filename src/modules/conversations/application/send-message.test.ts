import { describe, it, expect, vi } from "vitest";
import { makeSendMessage } from "./send-message";
import type { ConversationRepository, MessageRecord, MessageRepository } from "./ports";

describe("makeSendMessage", () => {
  function makeSut() {
    const conversation = {
      id: "conv-1",
      projectId: "store-1",
      channel: "INSTAGRAM" as const,
      status: "AI_ACTIVE",
      externalId: "ext-1",
      customerId: null,
      assignedHumanId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const conversations: ConversationRepository = {
      findById: vi.fn().mockResolvedValue(conversation),
    } as unknown as ConversationRepository;

    const messages: MessageRepository = {
      append: vi.fn().mockResolvedValue({
        id: "msg-1",
        conversationId: "conv-1",
        inReplyToMessageId: null,
        sender: "HUMAN",
        content: "Hello",
        createdAt: new Date(),
      } as MessageRecord),
    } as unknown as MessageRepository;

    const sendMessage = vi.fn().mockResolvedValue(undefined);

    return {
      conversations,
      messages,
      sendMessage,
      send: makeSendMessage({ conversations, messages, sendMessage }),
    };
  }

  it("appends a HUMAN message and calls the outbound sender for Instagram", async () => {
    const { send, messages, sendMessage } = makeSut();

    await send({ conversationId: "conv-1", projectId: "store-1", sender: "HUMAN", content: "Hello" });

    expect(messages.append).toHaveBeenCalledWith({
      conversationId: "conv-1",
      projectId: "store-1",
      sender: "HUMAN",
      content: "Hello",
    });
    expect(sendMessage).toHaveBeenCalledWith({
      projectId: "store-1",
      recipientId: "ext-1",
      text: "Hello",
    });
  });

  it("appends a message without calling the sender when externalId is missing", async () => {
    const { send, conversations, sendMessage } = makeSut();
    conversations.findById = vi.fn().mockResolvedValue({
      id: "conv-1",
      projectId: "store-1",
      channel: "INSTAGRAM" as const,
      status: "AI_ACTIVE",
      externalId: null,
      customerId: null,
      assignedHumanId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await send({ conversationId: "conv-1", projectId: "store-1", sender: "HUMAN", content: "Hello" });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("does not fail when the outbound sender throws", async () => {
    const { send, sendMessage, messages } = makeSut();
    sendMessage.mockRejectedValue(new Error("Graph API error"));

    await expect(
      send({ conversationId: "conv-1", projectId: "store-1", sender: "HUMAN", content: "Hello" }),
    ).resolves.toEqual(expect.objectContaining({ content: "Hello" }));
    expect(messages.append).toHaveBeenCalled();
  });

  it("throws when the conversation does not exist", async () => {
    const { send, conversations } = makeSut();
    conversations.findById = vi.fn().mockResolvedValue(null);

    await expect(
      send({ conversationId: "conv-1", projectId: "store-1", sender: "HUMAN", content: "Hello" }),
    ).rejects.toThrow("Conversation not found");
  });

  it("throws when the content is empty", async () => {
    const { send } = makeSut();

    await expect(
      send({ conversationId: "conv-1", projectId: "store-1", sender: "HUMAN", content: "   " }),
    ).rejects.toThrow("Message cannot be empty");
  });

  it("throws when the content exceeds 2000 characters", async () => {
    const { send } = makeSut();

    await expect(
      send({ conversationId: "conv-1", projectId: "store-1", sender: "HUMAN", content: "x".repeat(2001) }),
    ).rejects.toThrow("Message is too long");
  });
});
