import { describe, it, expect, vi } from "vitest";
import { makeGenerateReply } from "./generate-reply";
import type { GenerateReplyDeps } from "./generate-reply";
import type { AIConfigurationRecord, AIProvider } from "./ports";
import { defaultAIConfigurationRecord } from "./ai-config";
import { defaultChannelSettings } from "../domain/ai-config";
import type { ChannelSettings } from "../domain/ai-config";
import type { ConversationCommands, ConversationQueries } from "@/modules/conversations";
import type { CrmQueries } from "@/modules/crm";
import type { EcommerceQueries } from "@/modules/ecommerce";
import type { EventBus } from "@/shared/events";
import type { MetaService } from "@/modules/meta";

function makeSut(rawReply: string) {
  const aiProvider: AIProvider = {
    complete: vi.fn().mockResolvedValue(rawReply),
  };

  const config: AIConfigurationRecord = defaultAIConfigurationRecord("store-1", {
    systemPrompt: "You are a helpful assistant.",
    tone: null,
  });

  const conversationQueries: ConversationQueries = {
    findReplyByInReplyToMessageId: vi.fn().mockResolvedValue(null),
    getConversation: vi.fn().mockResolvedValue({
      conversation: {
        id: "conv-1",
        projectId: "store-1",
        channel: "INSTAGRAM" as const,
        status: "AI_ACTIVE",
        externalId: "ext-1",
        customerId: null,
        assignedHumanId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      messages: [
        {
          id: "msg-1",
          conversationId: "conv-1",
          inReplyToMessageId: null,
          sender: "CUSTOMER" as const,
          content: "Help",
          createdAt: new Date(),
        },
      ],
    }),
  } as unknown as ConversationQueries;

  const conversationCommands: ConversationCommands = {
    appendMessage: vi.fn().mockResolvedValue(undefined),
    setHumanActive: vi.fn().mockResolvedValue(undefined),
  } as unknown as ConversationCommands;

  const crmQueries: CrmQueries = {
    getCustomerProfile: vi.fn().mockResolvedValue(null),
  } as unknown as CrmQueries;

  const ecommerceQueries: EcommerceQueries = {
    listProducts: vi.fn().mockResolvedValue([]),
    listCoupons: vi.fn().mockResolvedValue([]),
  } as unknown as EcommerceQueries;

  const metaService = {
    sendMessage: vi.fn().mockResolvedValue(undefined),
  } as unknown as MetaService;

  const eventBus: EventBus = {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  };

  const deps: GenerateReplyDeps = {
    aiProvider,
    aiConfigurationRepository: {
      getOrCreateDefault: vi.fn().mockResolvedValue(config),
    } as unknown as GenerateReplyDeps["aiConfigurationRepository"],
    conversationQueries,
    conversationCommands,
    crmQueries,
    ecommerceQueries,
    metaService,
    eventBus,
    getOrganizationIdByStoreId: vi.fn().mockResolvedValue("org-1"),
    consumeAIReply: vi.fn().mockResolvedValue(true),
    auditLogCommands: {
      create: vi.fn().mockResolvedValue(undefined),
    },
  };

  return { deps, aiProvider };
}

describe("makeGenerateReply escalation marker (L7)", () => {
  it("detects [ESCALATE] and strips the marker", async () => {
    const { deps } = makeSut("[ESCALATE] I need a human");
    const generateReply = makeGenerateReply(deps);

    const result = await generateReply({
      conversationId: "conv-1",
      externalUserId: "ext-1",
      messageId: "msg-1",
    });

    expect(result.escalate).toBe(true);
    expect(result.text).toBe("I need a human");
    expect(deps.conversationCommands.setHumanActive).toHaveBeenCalled();
  });

  it("detects [escalate] case-insensitively", async () => {
    const { deps } = makeSut("[escalate] lower case marker");
    const generateReply = makeGenerateReply(deps);

    const result = await generateReply({
      conversationId: "conv-1",
      externalUserId: "ext-1",
      messageId: "msg-1",
    });

    expect(result.escalate).toBe(true);
    expect(result.text).toBe("lower case marker");
  });

  it("detects [Escalate] with mixed case", async () => {
    const { deps } = makeSut("[Escalate] mixed case marker");
    const generateReply = makeGenerateReply(deps);

    const result = await generateReply({
      conversationId: "conv-1",
      externalUserId: "ext-1",
      messageId: "msg-1",
    });

    expect(result.escalate).toBe(true);
    expect(result.text).toBe("mixed case marker");
  });

  it("does not escalate when the marker is absent", async () => {
    const { deps } = makeSut("Thanks for reaching out!");
    const generateReply = makeGenerateReply(deps);

    const result = await generateReply({
      conversationId: "conv-1",
      externalUserId: "ext-1",
      messageId: "msg-1",
    });

    expect(result.escalate).toBe(false);
    expect(result.text).toBe("Thanks for reaching out!");
    expect(deps.conversationCommands.appendMessage).toHaveBeenCalled();
  });
});

describe("makeGenerateReply channel gating", () => {
  function makeDeps(overrides: { channel?: "INSTAGRAM" | "FACEBOOK"; channelSettings?: Partial<ChannelSettings> } = {}) {
    const { channel = "INSTAGRAM", channelSettings = {} } = overrides;
    const { deps, aiProvider } = makeSut("Autoreply");
    const key = channel === "FACEBOOK" ? "facebook" : "instagram";

    const config: AIConfigurationRecord = defaultAIConfigurationRecord("store-1", {
      channelSettings: {
        ...defaultChannelSettings,
        [key]: {
          ...defaultChannelSettings[key],
          ...channelSettings[key],
        },
      } as ChannelSettings,
    });

    deps.aiConfigurationRepository = {
      getOrCreateDefault: vi.fn().mockResolvedValue(config),
    } as unknown as GenerateReplyDeps["aiConfigurationRepository"];

    deps.conversationQueries.getConversation = vi.fn().mockResolvedValue({
      conversation: {
        id: "conv-1",
        projectId: "store-1",
        channel,
        status: "AI_ACTIVE",
        externalId: "ext-1",
        customerId: null,
        assignedHumanId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      messages: [{ id: "msg-1", conversationId: "conv-1", inReplyToMessageId: null, sender: "CUSTOMER" as const, content: "Help", createdAt: new Date() }],
    });

    return { deps, aiProvider };
  }

  it("returns empty when the conversation channel is disabled", async () => {
    const { deps } = makeDeps({
      channelSettings: {
        instagram: { enabled: false, tone: "friendly", businessHoursStart: null, businessHoursEnd: null },
      },
    });
    const generateReply = makeGenerateReply(deps);

    const result = await generateReply({ conversationId: "conv-1", externalUserId: "ext-1", messageId: "msg-1" });

    expect(result).toEqual({ text: "", escalate: false });
    expect(deps.aiProvider.complete).not.toHaveBeenCalled();
    expect(deps.conversationCommands.appendMessage).not.toHaveBeenCalled();
  });

  it("returns empty when current time is outside business hours", async () => {
    const { deps } = makeDeps({
      channelSettings: {
        instagram: { enabled: true, tone: "friendly", businessHoursStart: "09:00", businessHoursEnd: "09:01" },
      },
    });
    const generateReply = makeGenerateReply(deps);

    const result = await generateReply({ conversationId: "conv-1", externalUserId: "ext-1", messageId: "msg-1" });

    expect(result).toEqual({ text: "", escalate: false });
    expect(deps.aiProvider.complete).not.toHaveBeenCalled();
  });
});
