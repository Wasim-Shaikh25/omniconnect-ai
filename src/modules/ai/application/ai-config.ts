import type { AIConfigurationRecord } from "./ports";
import type {
  EnabledSkills,
  SalesRules,
  ChannelSettings,
  EscalationRules,
  ModelOverrides,
} from "../domain/ai-config";
import {
  defaultEnabledSkills,
  defaultSalesRules,
  defaultChannelSettings,
  defaultEscalationRules,
  defaultModelOverrides,
} from "../domain/ai-config";

export function defaultAIConfigurationRecord(
  projectId: string,
  overrides?: Partial<AIConfigurationRecord>,
): AIConfigurationRecord {
  return {
    projectId,
    aiName: null,
    brandVoice: null,
    language: "en",
    systemPrompt: "You are a helpful AI assistant for this brand.",
    tone: "friendly and concise",
    welcomeStrategy: null,
    couponStrategy: null,
    salesStrategy: null,
    enabledSkills: { ...defaultEnabledSkills } as EnabledSkills,
    salesRules: { ...defaultSalesRules } as SalesRules,
    channelSettings: { ...defaultChannelSettings } as ChannelSettings,
    escalationRules: { ...defaultEscalationRules } as EscalationRules,
    modelOverrides: { ...defaultModelOverrides } as ModelOverrides,
    knowledgeBase: null,
    model: "gpt-4o-mini",
    ...overrides,
  };
}
