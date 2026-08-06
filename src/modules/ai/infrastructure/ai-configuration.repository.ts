import { prisma } from "@/shared/database";
import type { AIConfigurationRecord, AIConfigurationRepository } from "../application/ports";
import {
  parseEnabledSkills,
  parseSalesRules,
  parseChannelSettings,
  parseEscalationRules,
  parseModelOverrides,
} from "../domain/ai-config";

const DEFAULT_SYSTEM_PROMPT = `You are a helpful eCommerce customer assistant. Answer questions about products, discounts, and orders. Be concise, friendly, and on-brand. If a customer asks for a human, asks something you cannot answer, or is frustrated, start your response with [ESCALATE] followed by a brief handoff message.`;

const DEFAULT_CONFIG = {
  aiName: null,
  brandVoice: null,
  language: "en",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  tone: "friendly and concise",
  welcomeStrategy:
    "Greet new followers, offer a welcome discount if one is active.",
  couponStrategy:
    "Explain active coupons and help customers apply them at checkout.",
  salesStrategy:
    "Recommend products from the catalog when the customer asks for suggestions or shows interest.",
  model: "gpt-4o-mini",
};

function toRecord(row: {
  projectId: string;
  aiName: string | null;
  brandVoice: string | null;
  language: string;
  systemPrompt: string;
  tone: string | null;
  welcomeStrategy: string | null;
  couponStrategy: string | null;
  salesStrategy: string | null;
  enabledSkills: unknown;
  salesRules: unknown;
  channelSettings: unknown;
  escalationRules: unknown;
  modelOverrides: unknown;
  knowledgeBase: string | null;
  productKnowledge: string | null;
  model: string;
}): AIConfigurationRecord {
  return {
    projectId: row.projectId,
    aiName: row.aiName,
    brandVoice: row.brandVoice,
    language: row.language,
    systemPrompt: row.systemPrompt,
    tone: row.tone,
    welcomeStrategy: row.welcomeStrategy,
    couponStrategy: row.couponStrategy,
    salesStrategy: row.salesStrategy,
    enabledSkills: parseEnabledSkills(row.enabledSkills),
    salesRules: parseSalesRules(row.salesRules),
    channelSettings: parseChannelSettings(row.channelSettings),
    escalationRules: parseEscalationRules(row.escalationRules),
    modelOverrides: parseModelOverrides(row.modelOverrides),
    knowledgeBase: row.knowledgeBase,
    productKnowledge: row.productKnowledge,
    model: row.model,
  };
}

export class PrismaAIConfigurationRepository
  implements AIConfigurationRepository
{
  async getByStore(projectId: string): Promise<AIConfigurationRecord | null> {
    const row = await prisma.aIConfiguration.findUnique({ where: { projectId } });
    return row ? toRecord(row) : null;
  }

  async getOrCreateDefault(
    projectId: string,
  ): Promise<AIConfigurationRecord> {
    const row = await prisma.aIConfiguration.upsert({
      where: { projectId },
      update: {},
      create: { projectId, ...DEFAULT_CONFIG },
    });
    return toRecord(row);
  }

  async update(
    projectId: string,
    input: Partial<Omit<AIConfigurationRecord, "projectId">>,
  ): Promise<AIConfigurationRecord> {
    const upserted = await prisma.aIConfiguration.upsert({
      where: { projectId },
      create: { projectId, ...DEFAULT_CONFIG, ...serialize(input) },
      update: serialize(input),
    });
    return toRecord(upserted);
  }
}

function serialize(input: Partial<Omit<AIConfigurationRecord, "projectId">>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (input.aiName !== undefined) data.aiName = input.aiName;
  if (input.brandVoice !== undefined) data.brandVoice = input.brandVoice;
  if (input.language !== undefined) data.language = input.language;
  if (input.systemPrompt !== undefined) data.systemPrompt = input.systemPrompt;
  if (input.tone !== undefined) data.tone = input.tone;
  if (input.welcomeStrategy !== undefined) data.welcomeStrategy = input.welcomeStrategy;
  if (input.couponStrategy !== undefined) data.couponStrategy = input.couponStrategy;
  if (input.salesStrategy !== undefined) data.salesStrategy = input.salesStrategy;
  if (input.knowledgeBase !== undefined) data.knowledgeBase = input.knowledgeBase;
  if (input.productKnowledge !== undefined) data.productKnowledge = input.productKnowledge;
  if (input.model !== undefined) data.model = input.model;
  if (input.enabledSkills !== undefined) data.enabledSkills = input.enabledSkills;
  if (input.salesRules !== undefined) data.salesRules = input.salesRules;
  if (input.channelSettings !== undefined) data.channelSettings = input.channelSettings;
  if (input.escalationRules !== undefined) data.escalationRules = input.escalationRules;
  if (input.modelOverrides !== undefined) data.modelOverrides = input.modelOverrides;
  return data;
}
