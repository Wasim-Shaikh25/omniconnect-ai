import { eventBus } from "@/shared/events";
import type { DetectCommerceInsights, EcommerceQueries } from "@/modules/ecommerce";
import type { ConversationQueries, DetectConversationInsights } from "@/modules/conversations";
import type { DetectCrmInsights, CrmQueries } from "@/modules/crm";
import type { SignalRepository, MetricRepository, BusinessInsightRepository, EntityLinkRepository } from "./ports";
import { BusinessInsightGenerated } from "../domain/events";
import type { BusinessInsightRecord, BusinessInsightEvidence, InsightType, InsightSeverity } from "../domain/types";
import type { DataQualityGateService } from "./validation-driven";

interface SignalSummary {
  id: string;
  eventType: string;
  subjectType: string;
  subjectId: string;
  storeId: string;
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
    organizationId: string;
    storeId: string;
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
      organizationId: insight.organizationId,
      storeId: insight.storeId,
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

  async function emitCommerceInsights(organizationId: string, storeId: string) {
    const { insights } = await input.detectCommerceInsights(organizationId, storeId);
    const openInsights = await input.insights.listOpen(organizationId, storeId, 50);
    for (const insight of insights) {
      const alreadyExists = openInsights.some((i) => i.title.toLowerCase() === insight.title.toLowerCase());
      if (alreadyExists) continue;
      await emit(mapExternalInsight(insight));
    }
  }

  async function emitCrmInsights(organizationId: string, storeId: string) {
    const { insights } = await input.detectCrmInsights(organizationId, storeId);
    const openInsights = await input.insights.listOpen(organizationId, storeId, 50);
    for (const insight of insights) {
      const alreadyExists = openInsights.some((i) => i.title.toLowerCase() === insight.title.toLowerCase());
      if (alreadyExists) continue;
      await emit(mapExternalInsight(insight));
    }
  }

  async function emitConversationInsights(organizationId: string, storeId: string) {
    const { insights } = await input.detectConversationInsights(organizationId, storeId);
    const openInsights = await input.insights.listOpen(organizationId, storeId, 50);
    for (const insight of insights) {
      const alreadyExists = openInsights.some((i) => i.title.toLowerCase() === insight.title.toLowerCase());
      if (alreadyExists) continue;
      await emit(mapExternalInsight(insight));
    }
  }

  function normalizePhrase(phrase: string): string {
    return phrase.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  }

  function contentMatches(content: string, title: string): boolean {
    const normalizedContent = normalizePhrase(content);
    const normalizedTitle = normalizePhrase(title).split(/\s+/).filter(Boolean);
    if (normalizedTitle.length === 0) return false;
    return normalizedTitle.every((word) => normalizedContent.includes(word));
  }

  async function detectProductAvailabilityAndDemand(organizationId: string, storeId: string) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const products = await input.ecommerce.listProducts(storeId, 100);
    if (products.length === 0) return;

    const inStockAlternatives = products
      .filter((p) => typeof p.inventory === "number" && p.inventory > 0)
      .sort((a, b) => (b.inventory ?? 0) - (a.inventory ?? 0));

    const allSignals = await input.signals.listByStore(storeId, 500);
    const productSignals = allSignals.filter(
      (s) => s.eventType === "ProductInventory" && s.subjectType === "product" && s.occurredAt >= sevenDaysAgo,
    );
    const messageSignals = allSignals.filter(
      (s) => s.eventType === "NewMessage" && s.subjectType === "conversation" && s.occurredAt >= sevenDaysAgo,
    );

    const openInsights = await input.insights.listOpen(organizationId, storeId, 50);

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
        if (contentMatches(content, product.title)) {
          matchingMessages.push({
            id: s.id,
            eventType: s.eventType,
            subjectType: s.subjectType,
            subjectId: s.subjectId,
            storeId: s.storeId,
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
        organizationId,
        storeId,
        type: (isOutOfStock ? "OPPORTUNITY" : "RISK") as InsightType,
        severity: (matchingMessages.length > 5 ? "HIGH" : "MEDIUM") as InsightSeverity,
        status: "OPEN",
        title: isOutOfStock
          ? `"${product.title}" is out of stock but ${matchingMessages.length} customer(s) asked about it`
          : `"${product.title}" is low stock (${inventory}) and ${matchingMessages.length} customer(s) asked about it`,
        description: evidence.summary,
        evidence,
        deepLink: `/stores/${storeId}/commerce/catalog`,
        generatedAt: now,
        dismissedAt: null,
        snoozedUntil: null,
      });
    }
  }

  async function detectStaleMetrics(organizationId: string, storeId: string) {
    const definitions = await input.metrics.listDefinitions(organizationId);
    for (const definition of definitions) {
      const latest = await input.metrics.getLatestSnapshot(definition.id, organizationId, storeId);
      if (!latest || latest.status !== "STALE") continue;

      const evidence: BusinessInsightEvidence = {
        signalIds: latest.sourceIds,
        metricIds: [latest.id],
        summary: `Metric ${definition.displayName} is stale and may not reflect current workspace activity.`,
      };

      await emit({
        organizationId,
        storeId,
        type: "ANOMALY" as InsightType,
        severity: "MEDIUM" as InsightSeverity,
        status: "OPEN",
        title: `Stale metric: ${definition.displayName}`,
        description: `The ${definition.displayName} metric has not been refreshed within its SLA. Check the store integration or event ingestion.`,
        evidence,
        deepLink: `/stores/${storeId}`,
        generatedAt: now,
        dismissedAt: null,
        snoozedUntil: null,
      });
    }
  }

  return {
    async analyzeOrganization(organizationId: string, storeIds: string[]) {
      for (const storeId of storeIds) {
        await this.analyzeStore(organizationId, storeId);
      }
    },

    async analyzeStore(organizationId: string, storeId: string) {
      if (input.dataQualityGate) {
        const gate = await input.dataQualityGate.check({ organizationId, storeId, priority: "high" });
        if (!gate.ok) {
          await emit({
            organizationId,
            storeId,
            type: "RISK" as InsightType,
            severity: "MEDIUM" as InsightSeverity,
            status: "OPEN",
            title: "Data quality gate blocked high-priority insight generation",
            description: `Data quality issues: ${gate.issues.join("; ")}`,
            evidence: { signalIds: [], metricIds: [], summary: gate.issues.join("; ") },
            deepLink: `/stores/${storeId}/integrations`,
            generatedAt: now,
            dismissedAt: null,
            snoozedUntil: null,
          });
          return;
        }
      }

      await emitCommerceInsights(organizationId, storeId);
      await emitCrmInsights(organizationId, storeId);
      await emitConversationInsights(organizationId, storeId);
      await detectProductAvailabilityAndDemand(organizationId, storeId);
      await detectStaleMetrics(organizationId, storeId);
    },
  };
}

export type DetectionService = ReturnType<typeof makeDetectionService>;
