import type { DetectCommerceInsights, CommerceInsight } from "@/modules/ecommerce";
import type { BusinessInsightRecord, BusinessInsightEvidence, InsightType, InsightSeverity } from "../domain/types";

export interface DiagnosisServiceInput {
  detectCommerceInsights: DetectCommerceInsights;
}

function mapCommerceInsight(insight: CommerceInsight): Omit<BusinessInsightRecord, "id" | "createdAt" | "updatedAt"> {
  const evidence: BusinessInsightEvidence = {
    signalIds: [],
    metricIds: [],
    summary: insight.description,
  };

  return {
    userId: insight.userId,
    projectId: insight.projectId,
    type: insight.type as InsightType,
    severity: insight.severity as InsightSeverity,
    status: insight.status as BusinessInsightRecord["status"],
    title: insight.title,
    description: insight.description,
    evidence,
    deepLink: insight.deepLink,
    generatedAt: insight.generatedAt,
    dismissedAt: null,
    snoozedUntil: null,
  };
}

export function makeDiagnosisService(input: DiagnosisServiceInput) {
  async function diagnoseRevenue(
    userId: string,
    projectId: string,
  ): Promise<Omit<BusinessInsightRecord, "id" | "createdAt" | "updatedAt"> | null> {
    const { insights } = await input.detectCommerceInsights(userId, projectId);
    const revenue = insights.find((i) => i.title.toLowerCase().includes("revenue"));
    if (!revenue) return null;
    return mapCommerceInsight(revenue);
  }

  return {
    diagnoseRevenue,
  };
}

export type DiagnosisService = ReturnType<typeof makeDiagnosisService>;
