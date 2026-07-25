import { eventBus } from "@/shared/events";
import type { EcommerceQueries } from "@/modules/ecommerce";
import type { ConversationQueries } from "@/modules/conversations";
import type { CrmQueries } from "@/modules/crm";
import type { SignalRepository, MetricRepository, BusinessInsightRepository } from "./ports";
import { BusinessInsightGenerated } from "../domain/events";
import type { BusinessInsightRecord, BusinessInsightEvidence, InsightType, InsightSeverity } from "../domain/types";

interface SignalSummary {
  eventType: string;
  subjectType: string;
  subjectId: string;
  storeId: string;
  occurredAt: Date;
}

export interface DetectionServiceInput {
  signals: SignalRepository;
  insights: BusinessInsightRepository;
  metrics: MetricRepository;
  ecommerce: EcommerceQueries;
  conversations: ConversationQueries;
  crm: CrmQueries;
  now?: Date;
}

export function makeDetectionService(input: DetectionServiceInput) {
  const now = input.now ?? new Date();

  async function recentSignals(
    organizationId: string,
    storeId: string,
    since: Date,
    eventType?: string,
  ): Promise<SignalSummary[]> {
    const rows = await input.signals.listByStore(storeId, 500);
    return rows
      .filter((s) => s.occurredAt >= since && (!eventType || s.eventType === eventType))
      .map((s) => ({
        eventType: s.eventType,
        subjectType: s.subjectType,
        subjectId: s.subjectId,
        storeId: s.storeId,
        occurredAt: s.occurredAt,
      }));
  }

  async function emit(insight: Omit<BusinessInsightRecord, "id" | "createdAt" | "updatedAt">) {
    const saved = await input.insights.save(insight);
    await eventBus.publish(new BusinessInsightGenerated(saved.id, { insight: saved }));
    return saved;
  }

  async function detectNoOrders(organizationId: string, storeId: string) {
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let orders: Awaited<ReturnType<typeof input.ecommerce.listOrders>> = [];
    try {
      orders = await input.ecommerce.listOrders(storeId, 50);
    } catch {
      // Treat a disconnected store as having no orders for detection purposes.
    }
    const recentOrders = orders.filter((o) => new Date(o.createdAt) >= oneDayAgo);
    if (recentOrders.length > 0) return;

    const signals = await recentSignals(organizationId, storeId, oneDayAgo, "NewMessage");
    const evidence: BusinessInsightEvidence = {
      signalIds: signals.map((s) => s.subjectId),
      metricIds: [],
      summary: "No completed orders in the last 24 hours despite existing conversation activity.",
    };

    await emit({
      organizationId,
      storeId,
      type: "RISK" as InsightType,
      severity: "HIGH" as InsightSeverity,
      status: "OPEN",
      title: "No orders in the last 24 hours",
      description: "There are active conversations but no recorded orders. Consider following up with high-intent customers or checking store integration health.",
      evidence,
      deepLink: `/stores/${storeId}/orders`,
      generatedAt: now,
      dismissedAt: null,
      snoozedUntil: null,
    });
  }

  async function detectHighIntentConversation(organizationId: string, storeId: string) {
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const recent = await recentSignals(organizationId, storeId, thirtyMinutesAgo, "NewMessage");
    const seen = new Set<string>();

    for (const signal of recent) {
      if (signal.subjectType !== "conversation") continue;
      if (seen.has(signal.subjectId)) continue;
      seen.add(signal.subjectId);

      const detail = await input.conversations.getConversation(signal.subjectId);
      if (!detail || detail.conversation.status === "HUMAN_ACTIVE") continue;
      if (new Date(detail.conversation.updatedAt) > thirtyMinutesAgo) continue;

      const evidence: BusinessInsightEvidence = {
        signalIds: [signal.subjectId],
        metricIds: [],
        summary: `Conversation ${signal.subjectId.slice(0, 8)} received a new customer message and has not been taken over by a human.`,
      };

      await emit({
        organizationId,
        storeId,
        type: "OPPORTUNITY" as InsightType,
        severity: "MEDIUM" as InsightSeverity,
        status: "OPEN",
        title: "High-intent conversation needs attention",
        description: `A ${detail.conversation.channel} conversation has an unanswered customer message. Review to avoid losing a hot lead.`,
        evidence,
        deepLink: `/stores/${storeId}/conversations/${signal.subjectId}`,
        generatedAt: now,
        dismissedAt: null,
        snoozedUntil: null,
      });
    }
  }

  async function detectStaleFollowers(organizationId: string, storeId: string) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentFollowerSignals = await recentSignals(organizationId, storeId, sevenDaysAgo, "FirstTimeFollowerDetected");
    if (recentFollowerSignals.length > 0) return;

    const followers = await input.crm.listFollowers(storeId, 100);
    if (followers.length === 0) return;

    const evidence: BusinessInsightEvidence = {
      signalIds: [],
      metricIds: [],
      summary: `No new followers in the last 7 days for a store with ${followers.length} existing followers.`,
    };

    await emit({
      organizationId,
      storeId,
      type: "RISK" as InsightType,
      severity: "MEDIUM" as InsightSeverity,
      status: "OPEN",
      title: "No new followers this week",
      description: "Follower growth has stalled. Consider a first-time follower campaign or content push.",
      evidence,
      deepLink: `/stores/${storeId}/campaigns/first-follower`,
      generatedAt: now,
      dismissedAt: null,
      snoozedUntil: null,
    });
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
        await detectNoOrders(organizationId, storeId);
        await detectHighIntentConversation(organizationId, storeId);
        await detectStaleFollowers(organizationId, storeId);
        await detectStaleMetrics(organizationId, storeId);
      }
    },

    async analyzeStore(organizationId: string, storeId: string) {
      await detectNoOrders(organizationId, storeId);
      await detectHighIntentConversation(organizationId, storeId);
      await detectStaleFollowers(organizationId, storeId);
      await detectStaleMetrics(organizationId, storeId);
    },
  };
}

export type DetectionService = ReturnType<typeof makeDetectionService>;
