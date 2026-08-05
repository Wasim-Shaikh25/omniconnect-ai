import { getQueue, jobRegistry } from "@/shared/queue";
import { startBullMQWorker } from "@/shared/queue/worker";
import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import type { ReadModelRefresher } from "../application/read-models";
import type { PredictionService } from "../application/prediction";
import type { BusinessLearningService } from "../application/business-learning";
import type { RecommendationRepository, OutcomeRepository } from "../application/ports";

export const INTELLIGENCE_QUEUE = "intelligence";

export const JOB_REFRESH_READ_MODELS = "REFRESH_READ_MODELS";
export const JOB_REFRESH_PREDICTIONS = "REFRESH_PREDICTIONS";
export const JOB_LEARN_FROM_OUTCOME = "LEARN_FROM_OUTCOME";
export const JOB_MEASURE_ACTION_OUTCOME = "MEASURE_ACTION_OUTCOME";

export interface MeasureActionOutcomeData {
  outcomeId: string;
  userId: string;
}

export interface ActionOutcomeMeasurer {
  measureById(outcomeId: string, userId: string): Promise<unknown>;
}

export interface RefreshReadModelsData {
  userId: string;
  projectId?: string;
}

export interface RefreshPredictionsData {
  userId: string;
  projectId?: string;
}

export interface LearnFromOutcomeData {
  recommendationId: string;
  outcomeId: string;
  userId: string;
}

export interface IntelligenceQueueHandlersInput {
  readModelRefresher: ReadModelRefresher;
  predictions: PredictionService;
  businessLearning: BusinessLearningService;
  recommendations: RecommendationRepository;
  outcomes: OutcomeRepository;
  actionOutcomeMeasurer: ActionOutcomeMeasurer;
}

export function registerIntelligenceQueueHandlers(deps: IntelligenceQueueHandlersInput): void {
  jobRegistry.register<RefreshReadModelsData>(JOB_REFRESH_READ_MODELS, async ({ data }) => {
    if (data.projectId) {
      await deps.readModelRefresher.refreshStore(data.userId, data.projectId);
    } else {
      logger.info("queue.refreshReadModels.workspace", { userId: data.userId });
      // Workspace-level refresh is not yet implemented in the refresher.
    }
  });

  jobRegistry.register<RefreshPredictionsData>(JOB_REFRESH_PREDICTIONS, async ({ data }) => {
    await deps.predictions.generateForStore(data.userId, data.projectId);
  });

  jobRegistry.register<MeasureActionOutcomeData>(JOB_MEASURE_ACTION_OUTCOME, async ({ data }) => {
    await deps.actionOutcomeMeasurer.measureById(data.outcomeId, data.userId);
  });

  jobRegistry.register<LearnFromOutcomeData>(JOB_LEARN_FROM_OUTCOME, async ({ data }) => {
    const outcome = await deps.outcomes.findById(data.outcomeId, data.userId);
    if (!outcome) {
      logger.warn("queue.learnFromOutcome.missingOutcome", { outcomeId: data.outcomeId });
      return;
    }
    const recommendation = await deps.recommendations.findById(data.recommendationId, data.userId);
    if (recommendation) {
      await deps.businessLearning.learnFromOutcome(recommendation, outcome);
    } else {
      logger.warn("queue.learnFromOutcome.missing", {
        recommendationId: data.recommendationId,
        outcomeId: data.outcomeId,
      });
    }
  });
}

export function startIntelligenceWorker(): void {
  // Ensure handlers are registered before starting the worker.
  void getQueue(INTELLIGENCE_QUEUE);
  if (env.REDIS_URL) {
    const concurrency = env.WORKER_CONCURRENCY ? Number(env.WORKER_CONCURRENCY) : 1;
    startBullMQWorker(INTELLIGENCE_QUEUE, Number.isNaN(concurrency) ? 1 : concurrency);
  }
}
