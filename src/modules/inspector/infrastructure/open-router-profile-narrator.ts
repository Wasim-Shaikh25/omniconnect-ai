import type { AIProvider, AICompletionConfig, AIMessage } from "@/modules/ai";
import type { ProfileInspectionResult } from "@/modules/inspector";
import type { ProfileNarrator } from "@/modules/inspector";

export interface OpenRouterProfileNarratorConfig {
  aiProvider: AIProvider;
  model: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

function buildPrompt(result: Omit<ProfileInspectionResult, "narration">): string {
  return [
    "You are an Instagram audience analyst. Describe the following profile using ONLY the provided deterministic numbers. Do not invent data.",
    "",
    `Username: ${result.username}`,
    `Followers: ${result.followerCount}`,
    `Engagement rate: ${(result.engagementRate * 100).toFixed(2)}%`,
    `Audience quality: ${result.audienceQuality.label} (score ${(result.audienceQuality.score * 100).toFixed(0)}, confidence ${(result.audienceQuality.confidence * 100).toFixed(0)})`,
    `Growth trend: ${result.growthTrend}`,
    `Top content type: ${result.topContent[0]?.type ?? "unknown"} with engagement ${result.topContent[0]?.engagement ?? 0}`,
    `Demographic confidence: ${result.demographics.confidence}`,
    `Top cities: ${result.demographics.topCities.map((c) => `${c.city} (${c.percentage}%)`).join(", ") || "unknown"}`,
    "",
    "Write a concise, confident summary for the merchant. Mention which metrics are estimated and which are direct public data.",
  ].join("\n");
}

export function makeOpenRouterProfileNarrator(config: OpenRouterProfileNarratorConfig): ProfileNarrator {
  return {
    async narrate(result: Omit<ProfileInspectionResult, "narration">): Promise<string> {
      const messages: AIMessage[] = [
        { role: "system", content: "You are a helpful analyst that only uses the data provided." },
        { role: "user", content: buildPrompt(result) },
      ];

      const completionConfig: AICompletionConfig = {
        model: config.model,
        operation: config.operation ?? "profile_narration",
        metadata: config.metadata,
      };

      return config.aiProvider.complete(messages, completionConfig);
    },
  };
}
