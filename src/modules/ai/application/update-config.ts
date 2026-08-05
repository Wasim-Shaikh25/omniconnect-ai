import { z } from "zod";
import type { AIConfigurationRecord, AIConfigurationRepository } from "./ports";

const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/).nullable().optional();

const channelSettingSchema = z.object({
  enabled: z.boolean(),
  tone: z.string().max(120),
  businessHoursStart: timeStringSchema,
  businessHoursEnd: timeStringSchema,
});

export const updateAIConfigSchema = z.object({
  projectId: z.string().min(1),
  aiName: z.string().max(120).optional().nullable(),
  brandVoice: z.string().max(120).optional().nullable(),
  language: z.string().max(10).optional(),
  systemPrompt: z.string().min(1).max(4000).optional(),
  tone: z.string().max(100).optional().nullable(),
  welcomeStrategy: z.string().max(2000).optional().nullable(),
  couponStrategy: z.string().max(2000).optional().nullable(),
  salesStrategy: z.string().max(2000).optional().nullable(),
  knowledgeBase: z.string().max(10000).optional().nullable(),
  model: z.string().min(1).max(100).optional(),
  enabledSkills: z.object({
    createCoupon: z.boolean().optional(),
    sendMessage: z.boolean().optional(),
    generateDashboard: z.boolean().optional(),
    accessOrderData: z.boolean().optional(),
    triggerCampaigns: z.boolean().optional(),
  }).optional(),
  salesRules: z.object({
    maxDiscountPct: z.coerce.number().min(0).max(100).optional(),
    maxUses: z.coerce.number().min(1).max(10000).optional(),
    dailyBudget: z.coerce.number().min(0).max(100000).optional(),
    autoSend: z.boolean().optional(),
  }).optional(),
  channelSettings: z.object({
    instagram: channelSettingSchema.optional(),
    facebook: channelSettingSchema.optional(),
    whatsapp: channelSettingSchema.optional(),
  }).optional(),
  escalationRules: z.object({
    onComplaint: z.boolean().optional(),
    onRefundRequest: z.boolean().optional(),
    onLowConfidence: z.boolean().optional(),
    notifyEmail: z.string().email().max(120).nullable().optional(),
    notifyPush: z.boolean().optional(),
  }).optional(),
  modelOverrides: z.object({
    reply: z.string().max(100).optional(),
    content: z.string().max(100).optional(),
    dashboard: z.string().max(100).optional(),
    inspector: z.string().max(100).optional(),
    analysis: z.string().max(100).optional(),
  }).optional(),
});

export type UpdateAIConfigInput = z.infer<typeof updateAIConfigSchema>;

export function makeUpdateAIConfiguration(deps: {
  repository: AIConfigurationRepository;
}) {
  return async function updateAIConfiguration(
    raw: UpdateAIConfigInput,
  ): Promise<AIConfigurationRecord> {
    const input = updateAIConfigSchema.parse(raw);
    const data: Partial<Omit<AIConfigurationRecord, "projectId">> = {};

    if (input.aiName !== undefined) data.aiName = input.aiName ?? null;
    if (input.brandVoice !== undefined) data.brandVoice = input.brandVoice ?? null;
    if (input.language !== undefined) data.language = input.language;
    if (input.systemPrompt !== undefined) data.systemPrompt = input.systemPrompt;
    if (input.tone !== undefined) data.tone = input.tone ?? null;
    if (input.welcomeStrategy !== undefined) data.welcomeStrategy = input.welcomeStrategy ?? null;
    if (input.couponStrategy !== undefined) data.couponStrategy = input.couponStrategy ?? null;
    if (input.salesStrategy !== undefined) data.salesStrategy = input.salesStrategy ?? null;
    if (input.knowledgeBase !== undefined) data.knowledgeBase = input.knowledgeBase ?? null;
    if (input.model !== undefined) data.model = input.model;

    // Merge with defaults so partial updates do not zero out other fields.
    const existing = await deps.repository.getOrCreateDefault(input.projectId);

    if (input.enabledSkills !== undefined) {
      data.enabledSkills = { ...existing.enabledSkills, ...input.enabledSkills };
    }
    if (input.salesRules !== undefined) {
      data.salesRules = { ...existing.salesRules, ...input.salesRules };
    }
    if (input.channelSettings !== undefined) {
      data.channelSettings = {
        ...existing.channelSettings,
        instagram: { ...existing.channelSettings.instagram, ...input.channelSettings.instagram },
        facebook: { ...existing.channelSettings.facebook, ...input.channelSettings.facebook },
        whatsapp: { ...existing.channelSettings.whatsapp, ...input.channelSettings.whatsapp },
      };
    }
    if (input.escalationRules !== undefined) {
      data.escalationRules = { ...existing.escalationRules, ...input.escalationRules };
    }
    if (input.modelOverrides !== undefined) {
      data.modelOverrides = { ...existing.modelOverrides, ...input.modelOverrides };
    }

    return deps.repository.update(input.projectId, data);
  };
}

export type UpdateAIConfiguration = ReturnType<
  typeof makeUpdateAIConfiguration
>;
