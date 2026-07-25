import type { BusinessInsightRepository, RecommendationRepository, PredictionRepository, OutcomeRepository, BusinessLearningRepository, GoalRepository } from "./ports";
import type { BusinessInsightRecord, RecommendationRecord, PredictionRecord, OutcomeRecord, BusinessLearningRecord, GoalRecord } from "../domain/types";

export interface BusinessBrainContextInput {
  insights: BusinessInsightRepository;
  recommendations: RecommendationRepository;
  predictions: PredictionRepository;
  outcomes: OutcomeRepository;
  learning: BusinessLearningRepository;
  goals: GoalRepository;
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
  summary: string;
}

export function makeBusinessBrainContextService(input: BusinessBrainContextInput) {
  return {
    async getContext(organizationId: string, storeId?: string): Promise<BusinessBrainContext> {
      const [topInsights, topRecommendations, activePredictions, recentOutcomes, learning, activeGoals] = await Promise.all([
        input.insights.listOpen(organizationId, storeId, 5),
        input.recommendations.listActive(organizationId, storeId, 5),
        input.predictions.listActive(organizationId, storeId, 5),
        input.outcomes.list(organizationId, storeId, 5),
        input.learning.list(organizationId, storeId, 5),
        input.goals.list(organizationId, storeId, 5),
      ]);

      const summaryParts: string[] = [];
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

      return {
        organizationId,
        storeId,
        topInsights,
        topRecommendations,
        activePredictions,
        recentOutcomes,
        learning,
        activeGoals,
        summary: summaryParts.join(" "),
      };
    },
  };
}

export type BusinessBrainContextService = ReturnType<typeof makeBusinessBrainContextService>;
