import type { EventBus } from "@/shared/events";
import type { BusinessInsightRepository } from "./ports";
import { DmPatternDetected, CommentPatternDetected } from "../domain/events";
import type {
  BusinessInsightEvidence,
  BusinessInsightRecord,
  InsightSeverity,
  InsightType,
  MarketingMemoryRecord,
} from "../domain/types";

export interface GenerateMarketingInsightsFromMemoryInput {
  insights: BusinessInsightRepository;
  eventBus: EventBus;
}

function categorySeverity(frequency: number): InsightSeverity {
  if (frequency >= 10) return "HIGH";
  if (frequency >= 5) return "MEDIUM";
  return "LOW";
}

function isRisk(category: string): boolean {
  return category === "PRICE_OBJECTION" || category === "COMPLAINT";
}

export function makeGenerateMarketingInsightsFromMemory(input: GenerateMarketingInsightsFromMemoryInput) {
  return async function generateMarketingInsightsFromMemory(
    memory: MarketingMemoryRecord,
  ): Promise<{ dm: number; comment: number }> {
    const openInsights = await input.insights.listOpen(memory.organizationId, memory.storeId, 50);

    function findDuplicate(titleFragment: string): boolean {
      return openInsights.some((i) => i.title.toLowerCase().includes(titleFragment.toLowerCase()));
    }

    async function emitPattern(
      draft: Omit<BusinessInsightRecord, "id" | "createdAt" | "updatedAt">,
      eventType: "dm" | "comment",
      category: string,
      frequency: number,
      sample: string | null,
    ) {
      const saved = await input.insights.save(draft);
      const payload = {
        organizationId: memory.organizationId,
        storeId: memory.storeId,
        category,
        frequency,
        sample,
        insightId: saved.id,
      };
      if (eventType === "dm") {
        await input.eventBus.publish(new DmPatternDetected(memory.storeId, payload));
      } else {
        await input.eventBus.publish(new CommentPatternDetected(memory.storeId, payload));
      }
      return saved;
    }

    let dmCount = 0;
    for (const pattern of memory.dmPatterns) {
      const titleFragment = `DM pattern: ${pattern.category}`;
      if (findDuplicate(titleFragment)) continue;

      const sample = pattern.samplePhrases[0] ?? null;
      const evidence: BusinessInsightEvidence = {
        signalIds: [],
        metricIds: [],
        summary: `${pattern.frequency} DM(s) matched ${pattern.category.replace(/_/g, " ").toLowerCase()}.${sample ? ` Sample: "${sample}"` : ""}`,
      };

      await emitPattern(
        {
          organizationId: memory.organizationId,
          storeId: memory.storeId,
          type: (isRisk(pattern.category) ? "RISK" : "OPPORTUNITY") as InsightType,
          severity: categorySeverity(pattern.frequency),
          status: "OPEN",
          title: `${titleFragment} (${pattern.frequency})`,
          description: evidence.summary,
          evidence,
          deepLink: `/stores/${memory.storeId}/conversations`,
          generatedAt: memory.generatedAt,
          dismissedAt: null,
          snoozedUntil: null,
        },
        "dm",
        pattern.category,
        pattern.frequency,
        sample,
      );
      dmCount++;
    }

    let commentCount = 0;
    for (const pattern of memory.commentPatterns) {
      const titleFragment = `Comment pattern: ${pattern.category}`;
      if (findDuplicate(titleFragment)) continue;

      const sample = pattern.samplePhrases[0] ?? null;
      const evidence: BusinessInsightEvidence = {
        signalIds: [],
        metricIds: [],
        summary: `${pattern.frequency} comment(s) matched ${pattern.category.replace(/_/g, " ").toLowerCase()}.${sample ? ` Sample: "${sample}"` : ""}`,
      };

      await emitPattern(
        {
          organizationId: memory.organizationId,
          storeId: memory.storeId,
          type: (isRisk(pattern.category) ? "RISK" : "OPPORTUNITY") as InsightType,
          severity: categorySeverity(pattern.frequency),
          status: "OPEN",
          title: `${titleFragment} (${pattern.frequency})`,
          description: evidence.summary,
          evidence,
          deepLink: `/stores/${memory.storeId}/commerce/comments`,
          generatedAt: memory.generatedAt,
          dismissedAt: null,
          snoozedUntil: null,
        },
        "comment",
        pattern.category,
        pattern.frequency,
        sample,
      );
      commentCount++;
    }

    return { dm: dmCount, comment: commentCount };
  };
}

export type GenerateMarketingInsightsFromMemory = ReturnType<typeof makeGenerateMarketingInsightsFromMemory>;
