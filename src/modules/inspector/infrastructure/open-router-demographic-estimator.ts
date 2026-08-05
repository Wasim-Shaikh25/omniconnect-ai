import { z } from "zod";
import type { AIProvider, AICompletionConfig, AIMessage } from "@/modules/ai";
import type { PublicProfile, DemographicEstimate } from "../domain/types";
import type { DemographicEstimator } from "../application/ports";
import { logger } from "@/shared/observability";

export interface OpenRouterDemographicEstimatorConfig {
  aiProvider: AIProvider;
  model: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

function buildPrompt(profile: PublicProfile): string {
  const media = profile.media.slice(0, 20);
  const comments = profile.comments.slice(0, 100).map((c) => c.text);
  const postingTimes = media.map((m) => m.timestamp);
  const locations = media.map((m) => m.location).filter((l): l is string => Boolean(l));
  const hashtags = media.flatMap((m) => m.hashtags);

  return [
    "You are an Instagram audience demographer. Estimate the audience demographics for the following public Instagram profile.",
    "Use signals from comment language, posting times, hashtag localities, tagged locations, and engagement patterns.",
    "Return ONLY a JSON object matching this schema:",
    '{"confidence":"high|medium|low","topCountries":[{"country":"string","percentage":number}],"topCities":[{"city":"string","percentage":number}],"ageRanges":[{"range":"string","percentage":number}],"genderSplit":{"male":number,"female":number,"other":number}}',
    "Percentages must sum to 100 within each group. Confidence must be high, medium, or low based on signal strength.",
    "",
    "Profile data:",
    JSON.stringify({
      username: profile.username,
      followerCount: profile.followerCount,
      bioLength: profile.bioLength,
      mediaCount: profile.mediaCount,
      postingTimes,
      locations,
      hashtags,
      sampleComments: comments,
    }),
  ].join("\n");
}

const demographicEstimateSchema = z.object({
  confidence: z.enum(["high", "medium", "low"]),
  topCountries: z.array(z.object({ country: z.string(), percentage: z.number() })),
  topCities: z.array(z.object({ city: z.string(), percentage: z.number() })),
  ageRanges: z.array(z.object({ range: z.string(), percentage: z.number() })),
  genderSplit: z.object({
    male: z.number(),
    female: z.number(),
    other: z.number(),
  }),
});

function normalizeEstimate(raw: z.infer<typeof demographicEstimateSchema>): DemographicEstimate {
  return {
    confidence: raw.confidence,
    topCountries: raw.topCountries,
    topCities: raw.topCities,
    ageRanges: raw.ageRanges,
    genderSplit: raw.genderSplit,
  };
}

export function makeOpenRouterDemographicEstimator(
  config: OpenRouterDemographicEstimatorConfig,
  fallback: DemographicEstimator,
): DemographicEstimator {
  return {
    async estimate(profile: PublicProfile): Promise<DemographicEstimate> {
      const messages: AIMessage[] = [
        {
          role: "system",
          content:
            "You are a careful analyst. Only return valid JSON matching the requested schema. Do not add commentary.",
        },
        { role: "user", content: buildPrompt(profile) },
      ];

      const completionConfig: AICompletionConfig = {
        model: config.model,
        operation: config.operation ?? "profile_demographics",
        metadata: config.metadata,
      };

      try {
        const raw = await config.aiProvider.complete(messages, completionConfig);
        const parsed = JSON.parse(raw);
        const validated = demographicEstimateSchema.safeParse(parsed);
        if (!validated.success) {
          logger.warn("inspector.demographicEstimate.parseFailed", {
            username: profile.username,
            errors: validated.error.issues,
          });
          return fallback.estimate(profile);
        }
        return normalizeEstimate(validated.data);
      } catch (error) {
        logger.warn("inspector.demographicEstimate.failed", {
          username: profile.username,
          error: error instanceof Error ? error.message : "unknown",
        });
        return fallback.estimate(profile);
      }
    },
  };
}
