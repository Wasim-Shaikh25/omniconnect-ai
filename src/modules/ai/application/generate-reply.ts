import type { EventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import type { CrmQueries, CustomerProfile } from "@/modules/crm";
import type {
  ConversationCommands,
  ConversationQueries,
  MessageRecord,
  MessageSender,
} from "@/modules/conversations";
import type { EcommerceQueries } from "@/modules/ecommerce";
import type { MetaService } from "@/modules/meta";
import { EscalationRequested, ReplyGenerated } from "../domain/events";
import type {
  AIConfigurationRecord,
  AIConfigurationRepository,
  AIProvider,
} from "./ports";

const MAX_CONTEXT_MESSAGES = 10;
const MAX_PRODUCTS = 10;
const MAX_COUPONS = 10;

export interface GenerateReplyDeps {
  aiProvider: AIProvider;
  aiConfigurationRepository: AIConfigurationRepository;
  conversationQueries: ConversationQueries;
  conversationCommands: ConversationCommands;
  crmQueries: CrmQueries;
  ecommerceQueries: EcommerceQueries;
  metaService: MetaService;
  eventBus: EventBus;
}

export interface GenerateReplyInput {
  conversationId: string;
  externalUserId: string;
}

function toMessageRole(sender: MessageSender): "user" | "assistant" {
  return sender === "AI" ? "assistant" : "user";
}

function isCouponActive(coupon: {
  status: string;
  expiresAt: Date | null;
}): boolean {
  if (coupon.status !== "ACTIVE") return false;
  if (!coupon.expiresAt) return true;
  return coupon.expiresAt.getTime() > Date.now();
}

function formatCoupons(
  profile: CustomerProfile | null,
  storeCoupons: {
    code: string;
    discountPct: number;
    status: string;
    expiresAt: Date | null;
  }[],
): string {
  const activeStoreCoupons = storeCoupons.filter(isCouponActive);
  const sent = profile?.coupons ?? [];
  const lines: string[] = [];
  if (activeStoreCoupons.length) {
    lines.push("Active store coupons:");
    for (const c of activeStoreCoupons) {
      lines.push(`- ${c.code}: ${c.discountPct}% off`);
    }
  }
  if (sent.length) {
    lines.push("Coupons already sent to this customer:");
    for (const c of sent) {
      lines.push(`- ${c.code}: ${c.discountPct}% off (${c.status})`);
    }
  }
  return lines.join("\n") || "No coupons available.";
}

function formatProducts(
  products: {
    title: string;
    price: number | null;
    currency: string | null;
    inventory: number | null;
  }[],
): string {
  if (!products.length) return "No products in catalog.";
  return products
    .map((p) => {
      const price =
        p.price !== null ? `${p.currency ?? "$"}${p.price.toFixed(2)}` : "—";
      const stock = p.inventory !== null ? ` (${p.inventory} in stock)` : "";
      return `- ${p.title}: ${price}${stock}`;
    })
    .join("\n");
}

function formatMemory(profile: CustomerProfile | null): string {
  if (!profile) return "No prior customer memory.";
  const lines = ["Customer profile:"];
  if (profile.customer.username)
    lines.push(`- username: ${profile.customer.username}`);
  if (profile.customer.tags.length)
    lines.push(`- tags: ${profile.customer.tags.join(", ")}`);
  if (profile.customer.interests.length)
    lines.push(`- interests: ${profile.customer.interests.join(", ")}`);
  const usedCoupons = profile.usages.map((u) => u.couponId);
  if (usedCoupons.length)
    lines.push(`- coupons used: ${usedCoupons.join(", ")}`);
  return lines.join("\n");
}

function buildSystemPrompt(
  config: AIConfigurationRecord,
  profile: CustomerProfile | null,
  products: {
    title: string;
    price: number | null;
    currency: string | null;
    inventory: number | null;
  }[],
  coupons: {
    code: string;
    discountPct: number;
    status: string;
    expiresAt: Date | null;
  }[],
): string {
  const sections = [
    config.systemPrompt,
    config.tone ? `Tone: ${config.tone}` : "",
    config.welcomeStrategy ? `Welcome strategy: ${config.welcomeStrategy}` : "",
    config.couponStrategy ? `Coupon strategy: ${config.couponStrategy}` : "",
    config.salesStrategy ? `Sales strategy: ${config.salesStrategy}` : "",
    config.escalationRules
      ? `Escalation rules: ${config.escalationRules}\nIf you must escalate, start your response with [ESCALATE] followed by a brief handoff message.`
      : "If the customer asks for a human or you cannot help, start your response with [ESCALATE] followed by a brief handoff message.",
    "",
    formatMemory(profile),
    "",
    "Products in catalog (recommend from these):",
    formatProducts(products),
    "",
    formatCoupons(profile, coupons),
  ];
  return sections.filter(Boolean).join("\n");
}

async function sendReply(
  deps: GenerateReplyDeps,
  input: {
    conversationId: string;
    storeId: string;
    externalUserId: string;
    text: string;
    escalate: boolean;
  },
): Promise<void> {
  if (input.escalate) {
    await deps.conversationCommands.setHumanActive(input.conversationId);
  } else {
    await deps.conversationCommands.appendMessage(
      input.conversationId,
      "AI",
      input.text,
    );
  }

  try {
    await deps.metaService.sendMessage({
      storeId: input.storeId,
      recipientId: input.externalUserId,
      text: input.text,
    });
  } catch (error) {
    logger.warn("ai.generateReply.sendMessageFailed", {
      conversationId: input.conversationId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  if (input.escalate) {
    await deps.eventBus.publish(
      new EscalationRequested(input.conversationId, {
        conversationId: input.conversationId,
        storeId: input.storeId,
        externalUserId: input.externalUserId,
        reason: "AI escalation marker triggered",
      }),
    );
  } else {
    await deps.eventBus.publish(
      new ReplyGenerated(input.conversationId, {
        conversationId: input.conversationId,
        storeId: input.storeId,
        externalUserId: input.externalUserId,
        text: input.text,
      }),
    );
  }
}

export function makeGenerateReply(deps: GenerateReplyDeps) {
  return async function generateReply(
    input: GenerateReplyInput,
  ): Promise<{ text: string; escalate: boolean }> {
    const { conversationId, externalUserId } = input;

    const conversation = await deps.conversationQueries.getConversation(
      conversationId,
    );
    if (!conversation) {
      logger.warn("ai.generateReply.conversationNotFound", { conversationId });
      return { text: "", escalate: false };
    }

    const { conversation: meta, messages } = conversation;
    if (meta.status !== "AI_ACTIVE") {
      return { text: "", escalate: false };
    }

    const storeId = meta.storeId;

    const [config, profile, products, coupons] = await Promise.all([
      deps.aiConfigurationRepository.getOrCreateDefault(storeId),
      deps.crmQueries.getCustomerProfile({
        storeId,
        externalUserId,
        channel: meta.channel,
      }),
      deps.ecommerceQueries.listProducts(storeId, MAX_PRODUCTS),
      deps.ecommerceQueries.listCoupons(storeId, MAX_COUPONS),
    ]);

    const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);
    const systemPrompt = buildSystemPrompt(config, profile, products, coupons);
    const aiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...recentMessages.map((m: MessageRecord) => ({
        role: toMessageRole(m.sender),
        content: m.content,
      })),
    ];

    let rawReply: string;
    try {
      rawReply = await deps.aiProvider.complete(aiMessages, {
        model: config.model,
      });
    } catch (error) {
      logger.error("ai.generateReply.providerFailed", {
        conversationId,
        error: error instanceof Error ? error.message : "unknown",
      });
      rawReply = "I'm sorry, I'm having trouble responding right now.";
    }

    const escalate = rawReply.includes("[ESCALATE]");
    const text =
      rawReply.replace(/\[ESCALATE\]/gi, "").trim() ||
      (escalate
        ? "I'm connecting you with a human agent who will help you shortly."
        : "Thanks for your message!");

    await sendReply(deps, { conversationId, storeId, externalUserId, text, escalate });

    return { text, escalate };
  };
}

export type GenerateReply = ReturnType<typeof makeGenerateReply>;
