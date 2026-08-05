import { prisma } from "@/shared/database";
import type {
  AIConfigurationRecord,
  AIConfigurationRepository,
} from "../application/ports";

const DEFAULT_SYSTEM_PROMPT = `You are a helpful eCommerce customer assistant. Answer questions about products, discounts, and orders. Be concise, friendly, and on-brand. If a customer asks for a human, asks something you cannot answer, or is frustrated, start your response with [ESCALATE] followed by a brief handoff message.`;

const DEFAULT_CONFIG = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  tone: "friendly and concise",
  welcomeStrategy:
    "Greet new followers, offer a welcome discount if one is active.",
  couponStrategy:
    "Explain active coupons and help customers apply them at checkout.",
  salesStrategy:
    "Recommend products from the catalog when the customer asks for suggestions or shows interest.",
  escalationRules:
    "Escalate to a human when the customer explicitly asks for one, uses words like 'human', 'agent', 'representative', or expresses strong dissatisfaction.",
  model: "gpt-4o-mini",
};

function toRecord(row: {
  storeId: string;
  systemPrompt: string;
  tone: string | null;
  welcomeStrategy: string | null;
  couponStrategy: string | null;
  salesStrategy: string | null;
  escalationRules: string | null;
  model: string;
}): AIConfigurationRecord {
  return {
    storeId: row.storeId,
    systemPrompt: row.systemPrompt,
    tone: row.tone,
    welcomeStrategy: row.welcomeStrategy,
    couponStrategy: row.couponStrategy,
    salesStrategy: row.salesStrategy,
    escalationRules: row.escalationRules,
    model: row.model,
  };
}

export class PrismaAIConfigurationRepository
  implements AIConfigurationRepository
{
  async getByStore(storeId: string): Promise<AIConfigurationRecord | null> {
    const row = await prisma.aIConfiguration.findUnique({ where: { storeId } });
    return row ? toRecord(row) : null;
  }

  async getOrCreateDefault(
    storeId: string,
  ): Promise<AIConfigurationRecord> {
    const row = await prisma.aIConfiguration.upsert({
      where: { storeId },
      update: {},
      create: { storeId, ...DEFAULT_CONFIG },
    });
    return toRecord(row);
  }

  async update(
    storeId: string,
    input: Partial<Omit<AIConfigurationRecord, "storeId">>,
  ): Promise<AIConfigurationRecord> {
    const upserted = await prisma.aIConfiguration.upsert({
      where: { storeId },
      create: { storeId, ...DEFAULT_CONFIG, ...input },
      update: input,
    });
    return toRecord(upserted);
  }
}
