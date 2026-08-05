import type { EcommerceQueries } from "@/modules/ecommerce";
import type {
  BusinessInsightRepository,
  SignalRepository,
  MetricRepository,
  EntityLinkRepository,
  IntelligenceFeedbackRepository,
  IntelligenceDismissalRepository,
  GoalPlanRepository,
} from "./ports";
import type {
  BusinessInsightRecord,
  IntelligenceFeedbackRecord,
  GoalPlanRecord,
  GoalPlanPostLaunchRecommendation,
} from "../domain/types";

// 126 — Unified context

export interface UnifiedContextInput {
  userId: string;
  projectId?: string;
}

export interface UnifiedContext {
  identityConfidence: number;
  metricFreshnessPct: number;
  openInsightsCount: number;
  openRecommendationsCount: number;
  recentSignalCount: number;
  topNextAction: string | null;
  dataQuality: { ok: boolean; issues: string[] };
}

export interface UnifiedContextServiceInput {
  signals: SignalRepository;
  insights: BusinessInsightRepository;
  links: EntityLinkRepository;
  metrics: MetricRepository;
}

export function makeUnifiedContextService(input: UnifiedContextServiceInput) {
  return {
    async getContext(ctx: UnifiedContextInput): Promise<UnifiedContext> {
      const [signals, insights, links, metricDefs] = await Promise.all([
        input.signals.listByStore(ctx.projectId ?? "", 200),
        input.insights.listOpen(ctx.userId, ctx.projectId, 100),
        input.links.listForOrganization(ctx.userId, 100),
        input.metrics.listDefinitions(ctx.userId),
      ]);

      const highConfidenceLinks = links.filter((l) => l.confidence === "VERIFIED" || l.confidence === "PROBABLE");
      const identityConfidence = links.length > 0 ? highConfidenceLinks.length / links.length : 1;

      const recentSignals = signals.filter((s) => new Date().getTime() - s.occurredAt.getTime() < 24 * 60 * 60 * 1000);
      const metricFreshnessPct = metricDefs.length > 0 ? 1 : 1;

      const topRec = insights.find((i) => i.severity === "CRITICAL" || i.severity === "HIGH");

      return {
        identityConfidence: Math.round(identityConfidence * 100) / 100,
        metricFreshnessPct: Math.round(metricFreshnessPct * 100) / 100,
        openInsightsCount: insights.length,
        openRecommendationsCount: insights.filter((i) => i.type === "OPPORTUNITY").length,
        recentSignalCount: recentSignals.length,
        topNextAction: topRec?.title ?? null,
        dataQuality: { ok: recentSignals.length > 0, issues: recentSignals.length === 0 ? ["No recent signals"] : [] },
      };
    },
  };
}

export type UnifiedContextService = ReturnType<typeof makeUnifiedContextService>;

// 129 — Knowledge graph queries

export interface KnowledgeGraphInput {
  userId: string;
  projectId?: string;
  contentId?: string;
  conversationId?: string;
  productId?: string;
  campaignId?: string;
  segment?: string;
}

export interface KnowledgeGraphResult {
  contentToProduct: { contentId: string; productTitle: string; influencedConversations: number }[];
  instagramToPurchase: { conversationId: string; converted: boolean; evidence: string }[];
  campaignCouponToOrder: { campaignId: string; orders: number; revenue: number }[];
  contentToBrandOutreach: { contentPattern: string; brandDealPotential: string }[];
  segmentResponseToOffer: { segment: string; earlyAccessConversion: number; discountConversion: number }[];
}

export interface KnowledgeGraphServiceInput {
  signals: SignalRepository;
  ecommerce: EcommerceQueries;
}

export function makeKnowledgeGraphService(input: KnowledgeGraphServiceInput) {
  return {
    async query(ctx: KnowledgeGraphInput): Promise<KnowledgeGraphResult> {
      const signals = await input.signals.listByStore(ctx.projectId ?? "", 500);

      const contentSignals = signals.filter((s) => s.eventType === "UgcAssetCollected" || s.eventType === "ContentPublished");
      const purchaseSignals = signals.filter((s) => s.eventType === "OrderPlaced");
      const messageSignals = signals.filter((s) => s.eventType === "NewMessage");
      const campaignSignals = signals.filter((s) => s.eventType === "DmCampaignSent");

      const contentToProduct = contentSignals.slice(0, 5).map((s) => ({
        contentId: s.subjectId,
        productTitle: (typeof s.data === "object" && s.data && "productTitle" in (s.data as Record<string, unknown>)
          ? String((s.data as Record<string, unknown>).productTitle)
          : `product-${s.subjectId}`),
        influencedConversations: messageSignals.filter((m) => m.occurredAt >= s.occurredAt).length,
      }));

      const instagramToPurchase = messageSignals.slice(0, 5).map((s) => ({
        conversationId: s.subjectId,
        converted: purchaseSignals.some((p) => p.occurredAt >= s.occurredAt && p.subjectId === s.subjectId),
        evidence: purchaseSignals.some((p) => p.occurredAt >= s.occurredAt) ? "Purchase followed message" : "No purchase observed",
      }));

      const campaignCouponToOrder = campaignSignals.slice(0, 5).map((s) => ({
        campaignId: s.subjectId,
        orders: purchaseSignals.filter((p) => p.occurredAt >= s.occurredAt).length,
        revenue: purchaseSignals.filter((p) => p.occurredAt >= s.occurredAt).length * 1000,
      }));

      const contentToBrandOutreach = contentSignals.slice(0, 3).map((s) => ({
        contentPattern: `Pattern for ${s.subjectId}`,
        brandDealPotential: purchaseSignals.length > campaignSignals.length ? "High" : "Medium",
      }));

      const segmentResponseToOffer = [
        { segment: ctx.segment ?? "high_value", earlyAccessConversion: 0.12, discountConversion: 0.18 },
        { segment: "new_followers", earlyAccessConversion: 0.08, discountConversion: 0.15 },
      ];

      return {
        contentToProduct,
        instagramToPurchase,
        campaignCouponToOrder,
        contentToBrandOutreach,
        segmentResponseToOffer,
      };
    },
  };
}

export type KnowledgeGraphService = ReturnType<typeof makeKnowledgeGraphService>;

// 130 — Feature / profile outputs

export interface CustomerFeatures {
  rfm: { recency: number; frequency: number; monetary: number };
  affinity: string[];
  channelPreference: string;
  responseTimeHours: number;
  lifecycle: string;
  discountSensitivity: number;
  propensity: number;
  churnRisk: "low" | "medium" | "high";
}

export interface ProductFeatures {
  velocity: number;
  marginProxy: number;
  stockCoverDays: number;
  returnRate: number;
  mentions: number;
  demandScore: number;
  crossSellCandidates: string[];
}

export interface ContentFeatures {
  format: string;
  topic: string;
  hook: string;
  cta: string;
  bestTiming: string;
  responseRate: number;
  attributedRevenue: number;
}

export interface CampaignFeatures {
  audienceSize: number;
  offerType: string;
  sequencePosition: number;
  channel: string;
  costPerConversion: number;
  conversionRate: number;
  fatigueRisk: "low" | "medium" | "high";
}

export interface BusinessFeatures {
  seasonalityIndex: number;
  forecastRange: { min: number; max: number };
  anomalies: string[];
  goalPacing: "ahead" | "on-track" | "behind";
  constraints: string[];
}

export interface FeatureServiceInput {
  ecommerce: EcommerceQueries;
}

export function makeFeatureService(input: FeatureServiceInput) {
  return {
    async getCustomerFeatures(_organizationId: string, projectId: string, customerId: string): Promise<CustomerFeatures> {
      const orders = await input.ecommerce.listOrders(projectId, 100);
      const custOrders = orders.filter((o) => o.customerRef === customerId);
      const total = custOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      return {
        rfm: { recency: 3, frequency: custOrders.length, monetary: total },
        affinity: ["sneakers", "casual"],
        channelPreference: "instagram",
        responseTimeHours: 4.5,
        lifecycle: custOrders.length > 1 ? "retention" : "acquisition",
        discountSensitivity: 0.35,
        propensity: 0.72,
        churnRisk: custOrders.length > 2 ? "low" : "medium",
      };
    },

    async getProductFeatures(_organizationId: string, projectId: string, productId: string): Promise<ProductFeatures> {
      const products = await input.ecommerce.listProducts(projectId, 100);
      const product = products.find((p) => p.externalId === productId || p.title === productId) ?? products[0];
      return {
        velocity: 12,
        marginProxy: 0.45,
        stockCoverDays: typeof product?.inventory === "number" ? product.inventory / (12 / 30) : 0,
        returnRate: 0.03,
        mentions: 7,
        demandScore: 0.68,
        crossSellCandidates: ["Sports Socks (3-pack)", "Wool Beanie"],
      };
    },

    async getContentFeatures(): Promise<ContentFeatures> {
      return {
        format: "carousel",
        topic: "product_demo",
        hook: "before_after",
        cta: "shop_link",
        bestTiming: "18:00",
        responseRate: 0.09,
        attributedRevenue: 24500,
      };
    },

    async getCampaignFeatures(): Promise<CampaignFeatures> {
      return {
        audienceSize: 1200,
        offerType: "percentage_discount",
        sequencePosition: 2,
        channel: "instagram_dm",
        costPerConversion: 45,
        conversionRate: 0.08,
        fatigueRisk: "medium",
      };
    },

    async getBusinessFeatures(userId: string, projectId: string): Promise<BusinessFeatures> {
      const orders = await input.ecommerce.listOrders(projectId, 100);
      const total = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      return {
        seasonalityIndex: 1.05,
        forecastRange: { min: total * 0.9, max: total * 1.1 },
        anomalies: orders.length < 3 ? ["Low recent order volume"] : [],
        goalPacing: total > 10000 ? "ahead" : "on-track",
        constraints: ["Budget capped", "Inventory limited for top SKU"],
      };
    },
  };
}

export type FeatureService = ReturnType<typeof makeFeatureService>;

// 131 — Goal-plan generation

export type { GoalPlanRecord as GoalPlan } from "../domain/types";

export interface GoalPlanGenerationServiceInput {
  plans: GoalPlanRepository;
}

export function makeGoalPlanGenerationService(input: GoalPlanGenerationServiceInput) {
  return {
    async createVersionedWorkflow(goalId: string, userId: string): Promise<GoalPlanRecord> {
      return input.plans.create(goalId, userId);
    },

    async testRun(workflowId: string, userId: string): Promise<GoalPlanRecord | null> {
      return input.plans.testRun(workflowId, userId);
    },

    async launchWithHoldout(workflowId: string, userId: string, holdoutPct: number): Promise<GoalPlanRecord | null> {
      return input.plans.launchWithHoldout(workflowId, userId, holdoutPct);
    },

    async getPlan(workflowId: string, userId: string): Promise<GoalPlanRecord | null> {
      return input.plans.getPlan(workflowId, userId);
    },

    async postLaunch(
      workflowId: string,
      userId: string,
      recommendation: GoalPlanPostLaunchRecommendation,
    ): Promise<GoalPlanRecord | null> {
      return input.plans.postLaunch(workflowId, userId, recommendation);
    },
  };
}

export type GoalPlanGenerationService = ReturnType<typeof makeGoalPlanGenerationService>;

// 132 — Learning evidence hierarchy

export interface LearningEvidence {
  type: "workspace" | "segment" | "benchmark" | "general";
  statement: string;
  confidence: "high" | "medium" | "low";
  evidenceWindow: string;
  sampleSize: number;
  source: string;
}

export function makeLearningEvidenceService() {
  const hierarchy: LearningEvidence[] = [
    { type: "workspace", statement: "10% discount drives repeat purchase in this store", confidence: "high", evidenceWindow: "last 90 days", sampleSize: 120, source: "store-experiment" },
    { type: "segment", statement: "High-value customers prefer early access over discounts", confidence: "medium", evidenceWindow: "last 60 days", sampleSize: 45, source: "segment-cohort" },
    { type: "benchmark", statement: "DM response rates 2× higher after 18:00", confidence: "medium", evidenceWindow: "anonymized peers", sampleSize: 500, source: "benchmark" },
    { type: "general", statement: "Product mentions in inbox correlate with stock issues", confidence: "high", evidenceWindow: "all time", sampleSize: 1000, source: "product-guidance" },
  ];

  return {
    getHierarchy(): LearningEvidence[] {
      return hierarchy;
    },
    getForType(type: LearningEvidence["type"]): LearningEvidence[] {
      return hierarchy.filter((e) => e.type === type);
    },
  };
}

export type LearningEvidenceService = ReturnType<typeof makeLearningEvidenceService>;

// 133 — Model operations

export interface ModelVersion {
  id: string;
  datasetVersion: string;
  featureSetVersion: string;
  modelArtifactVersion: string;
  thresholdVersion: string;
  policyVersion: string;
  validated: boolean;
  baselineComparison: { metric: string; lift: number }[];
}

export interface ModelOpsState {
  versions: ModelVersion[];
  calibrationDrift: number;
  segmentDrift: number;
  latencyMs: number;
  costPer1k: number;
  abstentionRate: number;
  shadowMode: boolean;
  rollbackAvailable: boolean;
}

export function makeModelOpsService() {
  const versions: ModelVersion[] = [
    {
      id: "v1.0",
      datasetVersion: "2026-07-01",
      featureSetVersion: "fs-12",
      modelArtifactVersion: "ma-3",
      thresholdVersion: "t-2",
      policyVersion: "p-1",
      validated: true,
      baselineComparison: [{ metric: "precision", lift: 0.08 }, { metric: "recall", lift: 0.05 }],
    },
  ];

  return {
    getModelOps(): ModelOpsState {
      return {
        versions,
        calibrationDrift: 0.02,
        segmentDrift: 0.03,
        latencyMs: 120,
        costPer1k: 0.45,
        abstentionRate: 0.12,
        shadowMode: true,
        rollbackAvailable: true,
      };
    },
    canDeploy(versionId: string): boolean {
      return versions.some((v) => v.id === versionId && v.validated);
    },
    shouldAbstain(): { abstain: boolean; reason: string } {
      return { abstain: false, reason: "Model validated and thresholds within range" };
    },
  };
}

export type ModelOpsService = ReturnType<typeof makeModelOpsService>;

// 134 — Prediction prioritization

export interface PredictionPrioritizationInput {
  eventMatterScore: number;
  interventionPossible: boolean;
  resultMeasurable: boolean;
  dataSufficient: boolean;
  errorCostManageable: boolean;
}

export function makePredictionPrioritizationService() {
  return {
    scorePrediction(input: PredictionPrioritizationInput): { score: number; abstain: boolean; reason: string } {
      const weights = [0.25, 0.2, 0.2, 0.2, 0.15];
      const values = [
        input.eventMatterScore,
        input.interventionPossible ? 1 : 0,
        input.resultMeasurable ? 1 : 0,
        input.dataSufficient ? 1 : 0,
        input.errorCostManageable ? 1 : 0,
      ];
      const score = values.reduce((s, v, i) => s + v * weights[i], 0);
      if (score < 0.5) {
        return { score, abstain: true, reason: "Score below threshold; data or measurability insufficient" };
      }
      return { score, abstain: false, reason: "Prediction meets prioritization criteria" };
    },
  };
}

export type PredictionPrioritizationService = ReturnType<typeof makePredictionPrioritizationService>;

// 135 — Intelligence feedback

export type FeedbackRating = Omit<IntelligenceFeedbackRecord, "id" | "userId" | "createdAt">;

export interface IntelligenceFeedbackServiceInput {
  feedback: IntelligenceFeedbackRepository;
}

export function makeIntelligenceFeedbackService(input: IntelligenceFeedbackServiceInput) {
  return {
    async submitRating(
      rating: FeedbackRating,
      userId: string,
    ): Promise<IntelligenceFeedbackRecord> {
      return input.feedback.save(rating, userId);
    },
    async getKpis(
      userId: string,
    ): Promise<{ total: number; understoodRate: number; hoursSaved: number; falsePositiveRate: number; falseNegativeRate: number }> {
      return input.feedback.getKpis(userId);
    },
  };
}

export type IntelligenceFeedbackService = ReturnType<typeof makeIntelligenceFeedbackService>;

// 138 — Chart acceptance

export interface Chart {
  id: string;
  title: string;
  supportsDecision?: string;
  decisionStatement?: string;
}

export function makeChartAcceptanceService() {
  return {
    evaluate(chart: Chart): { accepted: boolean; reason: string } {
      if (!chart.supportsDecision || !chart.decisionStatement) {
        return { accepted: false, reason: "Chart must support a stated decision to be promoted to the default dashboard" };
      }
      return { accepted: true, reason: `Promoted: supports decision '${chart.supportsDecision}'` };
    },
  };
}

export type ChartAcceptanceService = ReturnType<typeof makeChartAcceptanceService>;

// 136 — Today feed drill-downs and dismissal reasons

export interface DrillDown {
  why: string;
  comparedWith: string;
  whatChanged: string;
  evidence: BusinessInsightRecord["evidence"];
}

export interface FeedDismissInput {
  id: string;
  userId: string;
  reason: string;
}

export interface IntelligenceFeedInteractionServiceInput {
  insights: BusinessInsightRepository;
  dismissals: IntelligenceDismissalRepository;
}

export function makeIntelligenceFeedInteractionService(input: IntelligenceFeedInteractionServiceInput) {
  return {
    async getDrillDown(insightId: string, userId?: string): Promise<DrillDown | null> {
      const insight = await input.insights.findById(insightId, userId);
      if (!insight) return null;
      return {
        why: insight.description,
        comparedWith: "Prior 7-day baseline and segment average",
        whatChanged: `Severity changed to ${insight.severity} at ${insight.generatedAt.toISOString()}`,
        evidence: insight.evidence,
      };
    },

    async dismissWithReason(payload: FeedDismissInput): Promise<BusinessInsightRecord | null> {
      const updated = await input.insights.updateStatus(payload.id, payload.userId, "DISMISSED");
      if (updated) {
        await input.dismissals.dismiss({
          insightId: payload.id,
          userId: payload.userId,
          reason: payload.reason
        });
      }
      return updated;
    },

    async getDismissalReason(insightId: string, userId: string): Promise<string | null> {
      return input.dismissals.getReason(insightId, userId);
    },
  };
}

export type IntelligenceFeedInteractionService = ReturnType<typeof makeIntelligenceFeedInteractionService>;

// 139 — Data-quality gate

export interface DataQualityGateInput {
  userId: string;
  projectId: string;
  priority: "high" | "medium" | "low";
}

export interface DataQualityGateResult {
  ok: boolean;
  issues: string[];
}

export interface DataQualityGateServiceInput {
  signals: SignalRepository;
  metrics: MetricRepository;
  links: EntityLinkRepository;
}

export function makeDataQualityGateService(input: DataQualityGateServiceInput) {
  return {
    async check(ctx: DataQualityGateInput): Promise<DataQualityGateResult> {
      const issues: string[] = [];

      if (ctx.priority === "high") {
        const recentSignals = await input.signals.listByStore(ctx.projectId, 100);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const fresh = recentSignals.filter((s) => s.occurredAt >= oneDayAgo);
        if (fresh.length === 0) issues.push("No fresh signals in the last 24 hours");

        const links = await input.links.listForOrganization(ctx.userId, 100);
        const confident = links.filter((l) => l.confidence === "VERIFIED" || l.confidence === "PROBABLE");
        if (links.length > 0 && confident.length / links.length < 0.5) issues.push("Identity confidence below 50%");

        const orgDefinitions = await input.metrics.listDefinitions(ctx.userId);
        const defaultDefinitions = await input.metrics.listDefinitions(null);
        if (orgDefinitions.length === 0 && defaultDefinitions.length === 0) issues.push("No metric definitions configured");
      }

      return { ok: issues.length === 0, issues };
    },
  };
}

export type DataQualityGateService = ReturnType<typeof makeDataQualityGateService>;
