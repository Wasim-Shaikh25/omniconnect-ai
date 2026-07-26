import type {
  BusinessInsightRepository,
  RecommendationRepository,
  PredictionRepository,
  OutcomeRepository,
  BusinessLearningRepository,
  GoalRepository,
  DailyActionRepository,
  JourneyRepository,
} from "./ports";
import type {
  BusinessInsightRecord,
  RecommendationRecord,
  PredictionRecord,
  OutcomeRecord,
  BusinessLearningRecord,
  GoalRecord,
  DailyActionRecord,
  JourneyRecord,
  MarketingMemoryRecord,
} from "../domain/types";

export interface BusinessBrainContextInput {
  insights: BusinessInsightRepository;
  recommendations: RecommendationRepository;
  predictions: PredictionRepository;
  outcomes: OutcomeRepository;
  learning: BusinessLearningRepository;
  goals: GoalRepository;
  dailyActions: DailyActionRepository;
  journeys: JourneyRepository;
  getMemory?: (organizationId: string, storeId: string) => Promise<MarketingMemoryRecord | null>;
}

export type CitationSource =
  | "DailyBrief"
  | "MarketingMemory"
  | "Journey"
  | "Recommendation"
  | "Insight"
  | "Prediction"
  | "Outcome"
  | "Goal";

export interface SourceCitation {
  source: CitationSource;
  reference: string;
  detail: string;
}

export interface BusinessBrainContext {
  organizationId: string;
  storeId?: string;
  topInsights: BusinessInsightRecord[];
  topRecommendations: RecommendationRecord[];
  activePredictions: PredictionRecord[];
  recentOutcomes: OutcomeRecord[];
  learning: BusinessLearningRecord[];
  activeGoals: GoalRecord[];
  todayActions: DailyActionRecord[];
  recentJourneys: JourneyRecord[];
  marketingMemory: MarketingMemoryRecord | null;
  citations: SourceCitation[];
  summary: string;
}

export function makeBusinessBrainContextService(input: BusinessBrainContextInput) {
  return {
    async getContext(organizationId: string, storeId?: string): Promise<BusinessBrainContext> {
      const [
        topInsights,
        topRecommendations,
        activePredictions,
        recentOutcomes,
        learning,
        activeGoals,
        todayActions,
        recentJourneys,
      ] = await Promise.all([
        input.insights.listOpen(organizationId, storeId, 5),
        input.recommendations.listActive(organizationId, storeId, 5),
        input.predictions.listActive(organizationId, storeId, 5),
        input.outcomes.list(organizationId, storeId, 5),
        input.learning.list(organizationId, storeId, 5),
        input.goals.list(organizationId, storeId, 5),
        input.dailyActions.listPending(organizationId, storeId, 5),
        input.journeys.list(organizationId, storeId, 5),
      ]);

      let marketingMemory: MarketingMemoryRecord | null = null;
      if (storeId && input.getMemory) {
        marketingMemory = await input.getMemory(organizationId, storeId).catch(() => null);
      }

      const citations: SourceCitation[] = [];
      if (marketingMemory) {
        citations.push({
          source: "MarketingMemory",
          reference: `memory:${marketingMemory.storeId}`,
          detail: `${marketingMemory.productScores.length} scored product(s); winning posting times tracked.`,
        });
        citations.push({
          source: "DailyBrief",
          reference: `brief:${marketingMemory.storeId}`,
          detail: "Latest daily brief derived from marketing memory.",
        });
      }
      for (const rec of topRecommendations) {
        citations.push({
          source: "Recommendation",
          reference: `recommendation:${rec.id}`,
          detail: `${rec.title}${rec.businessObjective ? ` (${rec.businessObjective})` : ""} — confidence ${Math.round((rec.confidence ?? 0) * 100)}%.`,
        });
      }
      for (const journey of recentJourneys) {
        citations.push({
          source: "Journey",
          reference: `journey:${journey.id}`,
          detail: `${journey.steps.length} touchpoint(s) → ${journey.outcome}.`,
        });
      }
      for (const insight of topInsights) {
        citations.push({ source: "Insight", reference: `insight:${insight.id}`, detail: insight.title });
      }

      const summaryParts: string[] = [];
      if (todayActions.length > 0) {
        summaryParts.push(`${todayActions.length} action(s) queued for today, top: "${todayActions[0].title}".`);
      }
      if (topInsights.length > 0) {
        summaryParts.push(`${topInsights.length} open insight(s), top: "${topInsights[0].title}".`);
      } else {
        summaryParts.push("No open insights.");
      }
      if (topRecommendations.length > 0) {
        summaryParts.push(`${topRecommendations.length} active recommendation(s), top: "${topRecommendations[0].title}".`);
      }
      if (activePredictions.length > 0) {
        summaryParts.push(`${activePredictions.length} active prediction(s).`);
      }
      if (recentOutcomes.length > 0) {
        summaryParts.push(`${recentOutcomes.length} recent outcome(s).`);
      }
      if (recentJourneys.length > 0) {
        summaryParts.push(`${recentJourneys.length} customer journey(s) tracked.`);
      }

      return {
        organizationId,
        storeId,
        topInsights,
        topRecommendations,
        activePredictions,
        recentOutcomes,
        learning,
        activeGoals,
        todayActions,
        recentJourneys,
        marketingMemory,
        citations,
        summary: summaryParts.join(" "),
      };
    },
  };
}

export type BusinessBrainContextService = ReturnType<typeof makeBusinessBrainContextService>;
