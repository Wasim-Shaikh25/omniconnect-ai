import type { AIConfigurationRecord, AIProvider } from "./ports";

export interface GenerateWelcomeInput {
  username: string | null;
  couponCode: string;
  discountPct: number;
  messageTemplate: string;
  toneOverride: string | null;
}

export interface GenerateWelcomeDeps {
  aiProvider: AIProvider;
  aiConfigurationRepository: {
    getOrCreateDefault(storeId: string): Promise<AIConfigurationRecord>;
  };
}

export function makeGenerateWelcome(deps: GenerateWelcomeDeps) {
  return async function generateWelcome(
    storeId: string,
    input: GenerateWelcomeInput,
  ): Promise<string> {
    const config = await deps.aiConfigurationRepository.getOrCreateDefault(
      storeId,
    );

    const tone = input.toneOverride ?? config.tone ?? "friendly and concise";
    const username = input.username ?? "there";

    const prompt = `${config.systemPrompt}

Tone: ${tone}

Campaign message template: ${input.messageTemplate}

Personalize this welcome message for a new follower named "${username}". Include their unique discount code "${input.couponCode}" (${input.discountPct}% off). Keep it concise, on-brand, and do not include the code more than once. If the template already contains "{{code}}" or "{{discount}}", substitute them. If it does not, append the code naturally at the end.`;

    const fallback = input.messageTemplate
      .replace(/\{\{\s*code\s*\}\}/gi, input.couponCode)
      .replace(/\{\{\s*discount\s*\}\}/gi, `${input.discountPct}%`)
      .replace(/\{\{\s*username\s*\}\}/gi, username);
    const safeFallback = fallback.includes(input.couponCode)
      ? fallback
      : `${fallback} Use code ${input.couponCode} for ${input.discountPct}% off!`;

    try {
      return await deps.aiProvider.complete(
        [{ role: "system" as const, content: prompt }],
        { model: config.model, fallback: safeFallback },
      );
    } catch {
      return safeFallback;
    }
  };
}

export type GenerateWelcome = ReturnType<typeof makeGenerateWelcome>;
