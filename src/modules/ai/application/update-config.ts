import { z } from "zod";
import type { AIConfigurationRecord, AIConfigurationRepository } from "./ports";

export const updateAIConfigSchema = z.object({
  storeId: z.string().min(1),
  systemPrompt: z.string().min(1).max(4000),
  tone: z.string().max(100).optional(),
  welcomeStrategy: z.string().max(2000).optional(),
  couponStrategy: z.string().max(2000).optional(),
  salesStrategy: z.string().max(2000).optional(),
  escalationRules: z.string().max(2000).optional(),
  model: z.string().min(1).max(100),
});

export type UpdateAIConfigInput = z.infer<typeof updateAIConfigSchema>;

export function makeUpdateAIConfiguration(deps: {
  repository: AIConfigurationRepository;
}) {
  return async function updateAIConfiguration(
    raw: UpdateAIConfigInput,
  ): Promise<AIConfigurationRecord> {
    const input = updateAIConfigSchema.parse(raw);
    return deps.repository.update(input.storeId, {
      systemPrompt: input.systemPrompt,
      tone: input.tone ?? null,
      welcomeStrategy: input.welcomeStrategy ?? null,
      couponStrategy: input.couponStrategy ?? null,
      salesStrategy: input.salesStrategy ?? null,
      escalationRules: input.escalationRules ?? null,
      model: input.model,
    });
  };
}

export type UpdateAIConfiguration = ReturnType<
  typeof makeUpdateAIConfiguration
>;
