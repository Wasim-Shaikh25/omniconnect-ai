/**
 * Server-only intelligence module barrel.
 *
 * Exports the wired application services, composition root, and background job
 * entry points. Client code should use `@/modules/intelligence` (types + actions).
 */
export {
  startIntelligenceWorker,
  registerIntelligenceQueueHandlers,
} from "./infrastructure/queue-handlers";

export {
  readModelRefresher,
  businessLearningService,
  predictionService,
} from "./infrastructure/container";

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
} from "./infrastructure/container";
