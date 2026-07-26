import { organizationQueries } from "@/modules/organizations";
import { eventBus } from "@/shared/events";
import {
  ecommerceQueries,
  executeEcommerceAction,
  detectCommerceInsights,
  StoreNotConnectedError,
} from "@/modules/ecommerce";
import {
  conversationQueries,
  executeConversationAction,
  detectConversationInsights,
} from "@/modules/conversations";
import {
  crmQueries,
  customerDirectory,
  detectCrmInsights,
} from "@/modules/crm";
import { analyticsQueries, getAccountMedia } from "@/modules/analytics/server";
import { socialQueries } from "@/modules/social";
import {
  growthQueries,
  executeGrowthAction,
  detectGrowthInsights,
} from "@/modules/growth";
import {
  brandDealQueries,
  detectBrandDealInsights,
} from "@/modules/branddeals";
import {
  notificationService,
  notificationQueries,
} from "@/modules/notifications";
import { makeSignalIngestionService } from "../application/signal-ingestion";
import { makeEntityResolutionService } from "../application/entity-resolution";
import { makeTimelineService } from "../application/timeline";
import { makeMetricService } from "../application/metrics";
import { makeDataQualityService } from "../application/data-quality";
import { makeCustomerSummaryService } from "../application/customer-summary";
import type { MetricSourceProvider } from "../application/metrics";
import { makeDetectionService } from "../application/detection";
import { makeDiagnosisService } from "../application/diagnosis";
import { makeIntelligenceFeed } from "../application/intelligence-feed";
import { makeRecommendationService } from "../application/recommendation";
import { makeRecommendationLifecycleService } from "../application/recommendation-lifecycle";
import { makeDailyActionService } from "../application/daily-action";
import { makeActionOutcomeService } from "../application/action-outcome";
import { makeJourneyService } from "../application/journey";
import { makeBusinessBrainContextService } from "../application/business-brain-context";
import { makeActionPlanService } from "../application/action-plan";
import { makeDecisionPolicyService } from "../application/decision-policy";
import { makeOutcomeService } from "../application/outcome";
import { makeGoalService } from "../application/goal";
import { makePredictionService } from "../application/prediction";
import { makeHypothesisService } from "../application/hypothesis";
import { makeBusinessLearningService } from "../application/business-learning";
import { makePortfolioService } from "../application/portfolio";
import { makeCompetitorIntelligenceService } from "../application/competitor-intelligence";
import { makeReadModelRefresher } from "../application/read-models";
import { makeCostLatencyMonitor } from "../application/system-health";
import { makeNextBestActionService } from "../application/next-best-action";
import { makeProactiveNotificationService } from "../application/proactive-notifications";
import { makeGoalAutomationService } from "../application/goal-automation";
import { makeKpiService } from "../application/kpi";
import { makeAiGovernanceService } from "../application/ai-governance";
import { makeQualityAssuranceService } from "../application/quality-assurance";
import { makeRolloutService } from "../application/rollout";
import { makeRiskMitigationRegistry } from "../application/risk-mitigations";
import { makeOperatingModelService } from "../application/operating-model";
import { makeUpdateMarketingMemory } from "../application/marketing-memory";
import { makeGenerateDailyBrief } from "../application/daily-brief";
import { makeGenerateMarketingInsightsFromMemory } from "../application/marketing-insights";
import {
  registerIntelligenceQueueHandlers,
  INTELLIGENCE_QUEUE,
  JOB_MEASURE_ACTION_OUTCOME,
  type MeasureActionOutcomeData,
} from "./queue-handlers";
import { getQueue } from "@/shared/queue";
import {
  makeUnifiedContextService,
  makeKnowledgeGraphService,
  makeFeatureService,
  makeGoalPlanGenerationService,
  makeLearningEvidenceService,
  makeModelOpsService,
  makePredictionPrioritizationService,
  makeIntelligenceFeedbackService,
  makeIntelligenceFeedInteractionService,
  makeChartAcceptanceService,
  makeDataQualityGateService,
} from "../application/validation-driven";
import { makeWorkspaceActionExecutor } from "./action-executor";
import {
  PrismaSignalRepository,
  PrismaEntityLinkRepository,
  PrismaDataQualityRepository,
  PrismaMetricRepository,
  PrismaBusinessInsightRepository,
  PrismaRecommendationRepository,
  PrismaActionPlanRepository,
  PrismaDecisionRepository,
  PrismaOutcomeRepository,
  PrismaGoalRepository,
  PrismaPredictionRepository,
  PrismaHypothesisRepository,
  PrismaBusinessLearningRepository,
  PrismaCompetitorInsightRepository,
  PrismaPortfolioSnapshotRepository,
  PrismaSystemMetricRepository,
  PrismaKpiRepository,
  PrismaRecommendationConflictRepository,
  PrismaDailyActionRepository,
  PrismaActionOutcomeRepository,
  PrismaJourneyRepository,
} from "./repositories";

const signals = new PrismaSignalRepository();
const links = new PrismaEntityLinkRepository();
const issues = new PrismaDataQualityRepository();
const metrics = new PrismaMetricRepository();
const insights = new PrismaBusinessInsightRepository();
const recommendations = new PrismaRecommendationRepository();
const recommendationConflicts = new PrismaRecommendationConflictRepository();
const actionPlans = new PrismaActionPlanRepository();
const decisions = new PrismaDecisionRepository();
const outcomes = new PrismaOutcomeRepository();
const goals = new PrismaGoalRepository();
const predictions = new PrismaPredictionRepository();
const hypotheses = new PrismaHypothesisRepository();
const learnings = new PrismaBusinessLearningRepository();
const competitorInsights = new PrismaCompetitorInsightRepository();
const portfolioSnapshots = new PrismaPortfolioSnapshotRepository();
const systemMetrics = new PrismaSystemMetricRepository();
const kpis = new PrismaKpiRepository();
const dailyActions = new PrismaDailyActionRepository();
const actionOutcomes = new PrismaActionOutcomeRepository();
const journeys = new PrismaJourneyRepository();

const metricProvider: MetricSourceProvider = {
  getWorkspaceOverview:
    organizationQueries.getOrganizationOverview.bind(organizationQueries),
  getConversationCount: async (storeId: string) => {
    const rows = await conversationQueries.listConversations(storeId, 1000);
    return rows.length;
  },
  getFollowerCount: async (storeId: string) => {
    const rows = await crmQueries.listFollowers(storeId, 1000);
    return rows.length;
  },
  getCouponCount: async (storeId: string) => {
    const rows = await ecommerceQueries.listCoupons(storeId, 1000);
    return rows.length;
  },
  getProductCount: async (storeId: string) => {
    const rows = await ecommerceQueries.listProducts(storeId, 1000);
    return rows.length;
  },
  getLastMessageAt: async (storeId: string) => {
    const conversations = await conversationQueries.listConversations(
      storeId,
      500,
    );
    const details = await Promise.all(
      conversations.map((c) => conversationQueries.getConversation(c.id)),
    );
    let latest: Date | null = null;
    for (const detail of details) {
      if (!detail) continue;
      for (const message of detail.messages) {
        if (
          message.sender === "CUSTOMER" &&
          (!latest || message.createdAt > latest)
        ) {
          latest = message.createdAt;
        }
      }
    }
    return latest;
  },
  getRevenue: async (storeId: string, days: number) => {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const orders = await ecommerceQueries.listOrders(storeId, 500);
      return orders
        .filter((o) => new Date(o.createdAt) >= cutoff)
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    } catch (error) {
      if (error instanceof StoreNotConnectedError) return 0;
      throw error;
    }
  },
  getOrderCount: async (storeId: string, days: number) => {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const orders = await ecommerceQueries.listOrders(storeId, 500);
      return orders.filter((o) => new Date(o.createdAt) >= cutoff).length;
    } catch (error) {
      if (error instanceof StoreNotConnectedError) return 0;
      throw error;
    }
  },
  getAverageOrderValue: async (storeId: string, days: number) => {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const orders = await ecommerceQueries.listOrders(storeId, 500);
      const recent = orders.filter((o) => new Date(o.createdAt) >= cutoff);
      if (recent.length === 0) return 0;
      return (
        recent.reduce((sum, o) => sum + (Number(o.total) || 0), 0) /
        recent.length
      );
    } catch (error) {
      if (error instanceof StoreNotConnectedError) return 0;
      throw error;
    }
  },
};

export const signalIngestionService = makeSignalIngestionService(signals);
export const entityResolutionService = makeEntityResolutionService(links);
export const timelineService = makeTimelineService(signals, links);
export const metricService = makeMetricService(metrics, metricProvider);
export const dataQualityService = makeDataQualityService(issues, metrics);
export const dataQualityGateService = makeDataQualityGateService({
  signals,
  metrics,
  links,
});
export const customerSummaryService = makeCustomerSummaryService();
export const diagnosisService = makeDiagnosisService({
  detectCommerceInsights,
});
export const detectionService = makeDetectionService({
  signals,
  insights,
  metrics,
  links,
  detectCommerceInsights,
  detectCrmInsights,
  detectConversationInsights,
  detectGrowthInsights,
  detectBrandDealInsights,
  ecommerce: ecommerceQueries,
  conversations: conversationQueries,
  crm: crmQueries,
  dataQualityGate: dataQualityGateService,
});
export const intelligenceFeedService = makeIntelligenceFeed({ insights });

const actionExecutor = makeWorkspaceActionExecutor({
  ecommerce: { execute: executeEcommerceAction },
  conversations: { execute: executeConversationAction },
  growth: { execute: executeGrowthAction },
});

export const recommendationService = makeRecommendationService({
  insights,
  recommendations,
  ecommerce: ecommerceQueries,
});
export const recommendationLifecycleService =
  makeRecommendationLifecycleService({
    recommendations,
    conflicts: recommendationConflicts,
  });
export const journeyService = makeJourneyService({ journeys });
export const actionOutcomeService = makeActionOutcomeService({
  actionOutcomes,
  dailyActions,
  metrics: metricService,
});
export const dailyActionService = makeDailyActionService({
  dailyActions,
  actionOutcomes,
  recommendations,
  prioritize: recommendationLifecycleService.prioritizeRecommendations,
  metrics: metricService,
  getMemory: (organizationId, storeId) =>
    updateMarketingMemory(organizationId, storeId),
  enqueueMeasurement: async (outcomeId: string) => {
    await getQueue(INTELLIGENCE_QUEUE).add<MeasureActionOutcomeData>(
      JOB_MEASURE_ACTION_OUTCOME,
      { outcomeId },
    );
  },
});
export const readModelRefresher = makeReadModelRefresher({
  detection: detectionService,
  recommendations: recommendationService,
  lifecycle: recommendationLifecycleService,
  metrics: metricService,
});
export const businessBrainContextService = makeBusinessBrainContextService({
  insights,
  recommendations,
  predictions,
  outcomes,
  learning: learnings,
  goals,
  dailyActions,
  journeys,
  getMemory: (organizationId, storeId) =>
    updateMarketingMemory(organizationId, storeId),
});
export const decisionPolicyService = makeDecisionPolicyService();
export const outcomeService = makeOutcomeService({ outcomes });
export const businessLearningService = makeBusinessLearningService({
  learning: learnings,
});
export const actionPlanService = makeActionPlanService({
  actionPlans,
  recommendations,
  decisions,
  outcomeService,
  businessLearning: businessLearningService,
  executor: actionExecutor,
  policy: decisionPolicyService,
  metrics: metricService,
});
export const goalService = makeGoalService({ goals, metrics: metricService });
export const goalAutomationService = makeGoalAutomationService({
  goalService,
  recommendations,
  actionPlans,
  goals,
});
export const predictionService = makePredictionService({
  predictions,
  signals,
  metrics: metricService,
  listCustomers: crmQueries.listCustomers.bind(crmQueries),
});
export const hypothesisService = makeHypothesisService({
  insights,
  hypotheses,
});
export const portfolioService = makePortfolioService({
  snapshots: portfolioSnapshots,
  predictions,
  recommendations,
  getStores: async (organizationId: string) => {
    const overview =
      await organizationQueries.getOrganizationOverview(organizationId);
    return overview?.stores.map((s) => ({ id: s.id, name: s.name })) ?? [];
  },
});
export const competitorIntelligenceService = makeCompetitorIntelligenceService({
  insights: competitorInsights,
  getStoreFollowerCount: async (organizationId: string, storeId: string) => {
    const snapshot = await metricService.getMetric(
      "follower_count",
      organizationId,
      storeId,
    );
    return typeof snapshot?.value === "number" ? snapshot.value : 0;
  },
});
export const costLatencyMonitor = makeCostLatencyMonitor({
  metrics: systemMetrics,
});
export const nextBestActionService = makeNextBestActionService({
  ecommerce: ecommerceQueries,
  crmQueries,
  customerDirectory,
  conversations: conversationQueries,
  signals,
  growth: growthQueries,
  brandDeals: brandDealQueries,
  competitorIntelligence: competitorIntelligenceService,
});
export const proactiveNotificationService = makeProactiveNotificationService({
  notifications: notificationService,
  notificationQueries,
});
export const kpiService = makeKpiService({ kpis });
export const aiGovernanceService = makeAiGovernanceService();
export const qualityAssuranceService = makeQualityAssuranceService({
  signals,
  signalIngestion: signalIngestionService,
  links,
  entityResolution: entityResolutionService,
  metrics: metricService,
  detection: detectionService,
  diagnosis: diagnosisService,
  insights,
  recommendations: recommendationService,
  recommendationRepo: recommendations,
  actionExecutor,
  decisionPolicy: decisionPolicyService,
  aiGovernance: aiGovernanceService,
  outcomes: outcomeService,
  outcomeRepo: outcomes,
});
export const rolloutService = makeRolloutService();
export const riskMitigationRegistry = makeRiskMitigationRegistry();
export const operatingModelService = makeOperatingModelService();
export const updateMarketingMemory = makeUpdateMarketingMemory({
  ecommerceQueries,
  conversationQueries,
  crmQueries,
  analyticsQueries,
  getAccountMedia,
  socialQueries,
  eventBus,
});
export const generateDailyBrief = makeGenerateDailyBrief({
  updateMarketingMemory,
  eventBus,
});
export const generateMarketingInsightsFromMemory =
  makeGenerateMarketingInsightsFromMemory({
    insights,
    eventBus,
  });

export const unifiedContextService = makeUnifiedContextService({
  signals,
  insights,
  links,
  metrics,
});
export const knowledgeGraphService = makeKnowledgeGraphService({
  signals,
  ecommerce: ecommerceQueries,
});
export const featureService = makeFeatureService({
  ecommerce: ecommerceQueries,
});
export const goalPlanGenerationService = makeGoalPlanGenerationService();
export const learningEvidenceService = makeLearningEvidenceService();
export const modelOpsService = makeModelOpsService();
export const predictionPrioritizationService =
  makePredictionPrioritizationService();
export const intelligenceFeedbackService = makeIntelligenceFeedbackService();
export const intelligenceFeedInteractionService =
  makeIntelligenceFeedInteractionService({ insights });
export const chartAcceptanceService = makeChartAcceptanceService();

registerIntelligenceQueueHandlers({
  readModelRefresher,
  predictions: predictionService,
  businessLearning: businessLearningService,
  recommendations,
  outcomes,
  actionOutcomeMeasurer: actionOutcomeService,
});

export {
  signals,
  links,
  issues,
  metrics,
  insights,
  recommendations,
  actionPlans,
  decisions,
  outcomes,
  goals,
  predictions,
  hypotheses,
  learnings,
  competitorInsights,
  portfolioSnapshots,
  systemMetrics,
  kpis,
  dailyActions,
  actionOutcomes,
  journeys,
};
