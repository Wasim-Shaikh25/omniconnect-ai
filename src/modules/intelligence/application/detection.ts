import { eventBus } from "@/shared/events";
import type { DetectCommerceInsights, EcommerceQueries } from "@/modules/ecommerce";
import type { ConversationQueries, DetectConversationInsights } from "@/modules/conversations";
import type { DetectCrmInsights, CrmQueries } from "@/modules/crm";
import type { DetectGrowthInsights } from "@/modules/growth";
import type { DetectBrandDealInsights } from "@/modules/branddeals";
import type { SignalRepository, MetricRepository, BusinessInsightRepository, EntityLinkRepository } from "./ports";
import { BusinessInsightGenerated } from "../domain/events";
import type { BusinessInsightRecord, BusinessInsightEvidence, InsightType, InsightSeverity } from "../domain/types";
import type { DataQualityGateService } from "./validation-driven";
import { detectProductMentions } from "./vocabulary";

interface SignalSummary {
  id: string;
  eventType: string;
  subjectType: string;
  subjectId: string;
  projectId: string;
  occurredAt: Date;
  data: unknown;
}

export interface DetectionServiceInput {
  signals: SignalRepository;
  insights: BusinessInsightRepository;
  metrics: MetricRepository;
  links: EntityLinkRepository;
  detectCommerceInsights: DetectCommerceInsights;
  detectCrmInsights: DetectCrmInsights;
  detectConversationInsights: DetectConversationInsights;
  detectGrowthInsights: DetectGrowthInsights;
  detectBrandDealInsights: DetectBrandDealInsights;
  ecommerce: EcommerceQueries;
  conversations: ConversationQueries;
  crm: CrmQueries;
  dataQualityGate?: DataQualityGateService;
  now?: Date;
}

export function makeDetectionService(input: DetectionServiceInput) {
  const now = input.now ?? new Date();

  async function emit(insight: Omit<BusinessInsightRecord, "id" | "createdAt" | "updatedAt">) {
    const saved = await input.insights.save(insight);
    await eventBus.publish(new BusinessInsightGenerated(saved.id, { insight: saved }));
    return saved;
  }

  interface ExternalInsight {
    userId: string;
    projectId: string;
    type: string;
    severity: string;
    status: string;
    title: string;
    description: string;
    deepLink: string;
    generatedAt: Date;
  }

  function mapExternalInsight(insight: ExternalInsight): Omit<BusinessInsightRecord, "id" | "createdAt" | "updatedAt"> {
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

  async function emitCommerceInsights(userId: string, projectId: string) {
    const { insights } = await input.detectCommerceInsights(userId, projectId);
    const openInsights = await input.insights.listOpen(userId, projectId, 50);
    for (const insight of insights) {
      const alreadyExists = openInsights.some((i) => i.title.toLowerCase() === insight.title.toLowerCase());
      if (alreadyExists) continue;
      await emit(mapExternalInsight(insight));
    }
  }

  async function emitCrmInsights(userId: string, projectId: string) {
    const { insights } = await input.detectCrmInsights(userId, projectId);
    const openInsights = await input.insights.listOpen(userId, projectId, 50);
    for (const insight of insights) {
      const alreadyExists = openInsights.some((i) => i.title.toLowerCase() === insight.title.toLowerCase());
      if (alreadyExists) continue;
      await emit(mapExternalInsight(insight));
    }
  }

  async function emitConversationInsights(userId: string, projectId: string) {
    const { insights } = await input.detectConversationInsights(userId, projectId);
    const openInsights = await input.insights.listOpen(userId, projectId, 50);
    for (const insight of insights) {
      const alreadyExists = openInsights.some((i) => i.title.toLowerCase() === insight.title.toLowerCase());
      if (alreadyExists) continue;
      await emit(mapExternalInsight(insight));
    }
  }

  async function emitGrowthInsights(userId: string, projectId: string) {
    const { insights } = await input.detectGrowthInsights(userId, projectId);
    const openInsights = await input.insights.listOpen(userId, projectId, 50);
    for (const insight of insights) {
      const alreadyExists = openInsights.some((i) => i.title.toLowerCase() === insight.title.toLowerCase());
      if (alreadyExists) continue;
      await emit(mapExternalInsight(insight));
    }
  }

  async function emitBrandDealInsights(userId: string, projectId: string) {
    const { insights } = await input.detectBrandDealInsights(userId, projectId);
    const openInsights = await input.insights.listOpen(userId, projectId, 50);
    for (const insight of insights) {
      const alreadyExists = openInsights.some((i) => i.title.toLowerCase() === insight.title.toLowerCase());
      if (alreadyExists) continue;
      await emit(mapExternalInsight(insight));
    }
  }

  async function detectProductAvailabilityAndDemand(userId: string, projectId: string) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const products = await input.ecommerce.listProducts(projectId, 100);
    if (products.length === 0) return;

    const inStockAlternatives = products
      .filter((p) => typeof p.inventory === "number" && p.inventory > 0)
      .sort((a, b) => (b.inventory ?? 0) - (a.inventory ?? 0));

    const allSignals = await input.signals.listByStore(projectId, 500);
    const productSignals = allSignals.filter(
      (s) => s.eventType === "ProductInventory" && s.subjectType === "product" && s.occurredAt >= sevenDaysAgo,
    );
    const messageSignals = allSignals.filter(
      (s) => s.eventType === "NewMessage" && s.subjectType === "conversation" && s.occurredAt >= sevenDaysAgo,
    );

    const openInsights = await input.insights.listOpen(userId, projectId, 50);

    for (const product of products) {
      const inventory = product.inventory ?? null;
      if (inventory === null) continue;

      const isOutOfStock = inventory === 0;
      const isLowStock = inventory > 0 && inventory < 5;
      if (!isOutOfStock && !isLowStock) continue;

      const matchingMessages: SignalSummary[] = [];
      for (const s of messageSignals) {
        const data = typeof s.data === "object" && s.data !== null ? (s.data as Record<string, unknown>) : {};
        const content = typeof data.content === "string" ? data.content : "";
        const mention = detectProductMentions(content, [{ externalId: product.externalId, title: product.title }])[0];
        if (mention) {
          matchingMessages.push({
            id: s.id,
            eventType: s.eventType,
            subjectType: s.subjectType,
            subjectId: s.subjectId,
            projectId: s.projectId,
            occurredAt: s.occurredAt,
            data: s.data,
          });
        }
      }

      if (matchingMessages.length === 0) continue;

      const alreadyExists = openInsights.some((i) =>
        i.title.toLowerCase().includes(product.title.toLowerCase()) &&
        i.title.toLowerCase().includes(isOutOfStock ? "out of stock" : "low stock"),
      );
      if (alreadyExists) continue;

      const productSignal = productSignals.find((s) => s.subjectId === product.externalId);
      const signalIds = [productSignal?.id, ...matchingMessages.map((m) => m.id)].filter((id): id is string => !!id);

      const alternative = inStockAlternatives.find((p) => p.externalId !== product.externalId);

      const evidence: BusinessInsightEvidence = {
        signalIds,
        metricIds: [],
        summary: `${matchingMessages.length} conversation(s) mentioned "${product.title}" in the last 7 days while inventory was ${isOutOfStock ? "out of stock" : `low (${inventory})`}.${alternative ? ` Suggest alternative: ${alternative.title}.` : ""}`,
      };

      await emit({
        userId,
        projectId,
        type: (isOutOfStock ? "OPPORTUNITY" : "RISK") as InsightType,
        severity: (matchingMessages.length > 5 ? "HIGH" : "MEDIUM") as InsightSeverity,
        status: "OPEN",
        title: isOutOfStock
          ? `"${product.title}" is out of stock but ${matchingMessages.length} customer(s) asked about it`
          : `"${product.title}" is low stock (${inventory}) and ${matchingMessages.length} customer(s) asked about it`,
        description: evidence.summary,
        evidence,
        deepLink: `/stores/${projectId}/commerce/catalog`,
        generatedAt: now,
        dismissedAt: null,
        snoozedUntil: null,
      });
    }
  }

  async function detectStaleMetrics(userId: string, projectId: string) {
    const definitions = await input.metrics.listDefinitions(userId);
    for (const definition of definitions) {
      const latest = await input.metrics.getLatestSnapshot(definition.id, userId, projectId);
      if (!latest || latest.status !== "STALE") continue;

      const evidence: BusinessInsightEvidence = {
        signalIds: latest.sourceIds,
        metricIds: [latest.id],
        summary: `Metric ${definition.displayName} is stale and may not reflect current workspace activity.`,
      };

      await emit({
        userId,
        projectId,
        type: "ANOMALY" as InsightType,
        severity: "MEDIUM" as InsightSeverity,
        status: "OPEN",
        title: `Stale metric: ${definition.displayName}`,
        description: `The ${definition.displayName} metric has not been refreshed within its SLA. Check the store integration or event ingestion.`,
        evidence,
        deepLink: `/stores/${projectId}`,
        generatedAt: now,
        dismissedAt: null,
        snoozedUntil: null,
      });
    }
  }

  return {
    async analyzeOrganization(userId: string, storeIds: string[]) {
      for (const projectId of storeIds) {
        await this.analyzeStore(userId, projectId);
      }
    },

    async analyzeStore(userId: string, projectId: string) {
      if (input.dataQualityGate) {
        const gate = await input.dataQualityGate.check({ userId, projectId, priority: "high" });
        if (!gate.ok) {
          await emit({
            userId,
            projectId,
            type: "RISK" as InsightType,
            severity: "MEDIUM" as InsightSeverity,
            status: "OPEN",
            title: "Data quality gate blocked high-priority insight generation",
            description: `Data quality issues: ${gate.issues.join("; ")}`,
            evidence: { signalIds: [], metricIds: [], summary: gate.issues.join("; ") },
            deepLink: `/stores/${projectId}/integrations`,
            generatedAt: now,
            dismissedAt: null,
            snoozedUntil: null,
          });
          return;
        }
      }

      await emitCommerceInsights(userId, projectId);
      await emitCrmInsights(userId, projectId);
      await emitConversationInsights(userId, projectId);
      await emitGrowthInsights(userId, projectId);
      await emitBrandDealInsights(userId, projectId);
      await detectProductAvailabilityAndDemand(userId, projectId);
      await detectStaleMetrics(userId, projectId);
    },
  };
}

export type DetectionService = ReturnType<typeof makeDetectionService>;
