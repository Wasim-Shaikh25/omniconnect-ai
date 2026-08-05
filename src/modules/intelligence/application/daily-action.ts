import { eventBus } from "@/shared/events";
import type {
  DailyActionRepository,
  ActionOutcomeRepository,
  RecommendationRepository,
} from "./ports";
import type {
  DailyActionRecord,
  ActionOutcomeRecord,
  BusinessObjective,
  MarketingMemoryRecord,
  RecommendationRecord,
} from "../domain/types";
import { computeActionPriority } from "../domain/daily-action";
import { inferBusinessObjective } from "../domain/objective";
import { DailyActionsGenerated, DailyActionCompleted, DailyActionSkipped } from "../domain/events";

export const OBJECTIVE_METRIC: Record<BusinessObjective, string> = {
  REVENUE: "revenue_7d",
  GROWTH: "follower_count",
  ENGAGEMENT: "conversation_count",
  RETENTION: "order_count_7d",
  SUPPORT: "response_time_minutes",
  BRAND: "follower_count",
};

const DEFAULT_WINDOW_HOURS = 48;

export interface RankedRecommendationLike extends RecommendationRecord {
  score: number;
}

export interface DailyActionServiceInput {
  dailyActions: DailyActionRepository;
  actionOutcomes: ActionOutcomeRepository;
  recommendations: RecommendationRepository;
  prioritize: (userId: string, projectId?: string, limit?: number) => Promise<RankedRecommendationLike[]>;
  metrics: { getMetric: (name: string, userId: string, projectId: string | null) => Promise<{ value: number | null } | null> };
  getMemory?: (userId: string, projectId: string) => Promise<MarketingMemoryRecord | null>;
  enqueueMeasurement?: (outcomeId: string, userId: string, delayMs: number) => Promise<void>;
  now?: () => Date;
  maxActions?: number;
  windowHours?: number;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function makeDailyActionService(input: DailyActionServiceInput) {
  const now = () => input.now?.() ?? new Date();
  const maxActions = input.maxActions ?? 5;
  const windowHours = input.windowHours ?? DEFAULT_WINDOW_HOURS;

  function memoryActions(
    userId: string,
    projectId: string,
    memory: MarketingMemoryRecord,
  ): Array<Omit<DailyActionRecord, "id" | "createdAt" | "updatedAt">> {
    const drafts: Array<Omit<DailyActionRecord, "id" | "createdAt" | "updatedAt">> = [];
    const bestTime = memory.winningPostingTimes[0];
    const topProduct = memory.productScores[0];
    if (bestTime && topProduct) {
      const objective: BusinessObjective = "ENGAGEMENT";
      drafts.push({
        userId,
        projectId,
        title: `Post about "${topProduct.productTitle}" at your winning time`,
        description: `Your audience engages most on ${bestTime.dayOfWeek} around ${bestTime.hour}:00. "${topProduct.productTitle}" is your strongest performer — schedule a post to capitalize on both signals.`,
        objective,
        confidence: 0.6,
        priority: computeActionPriority({ objective, confidence: 0.6, recommendationScore: 20 }),
        sourceSignals: {
          source: "MarketingMemory",
          bestPostingTime: bestTime,
          product: { id: topProduct.productId, title: topProduct.productTitle, score: topProduct.compositeScore },
        },
        suggestedAction: "OPEN_CONTENT_STUDIO",
        deepLink: `/stores/${projectId}/content`,
        status: "PENDING",
        metricName: OBJECTIVE_METRIC[objective],
        completedAt: null,
        skippedAt: null,
        feedback: null,
        outcomeId: null,
        generatedForDate: now(),
      });
    }
    return drafts;
  }

  async function generate(userId: string, projectId?: string): Promise<DailyActionRecord[]> {
    // Idempotent per day: return today's actions if already generated.
    const since = startOfDay(now());
    const existing = await input.dailyActions.listForDate(userId, since, projectId, 50);
    if (existing.length > 0) {
      return existing.filter((a) => a.status === "PENDING");
    }

    const ranked = await input.prioritize(userId, projectId, 25);
    const drafts: Array<Omit<DailyActionRecord, "id" | "createdAt" | "updatedAt">> = [];

    for (const rec of ranked) {
      const objective: BusinessObjective =
        rec.businessObjective ?? inferBusinessObjective(rec.reasonCodes, rec.objective);
      const confidence = rec.confidence ?? 0.5;
      drafts.push({
        userId,
        projectId: rec.projectId,
        title: rec.title,
        description: rec.description,
        objective,
        confidence,
        priority: computeActionPriority({ objective, confidence, recommendationScore: rec.score }),
        sourceSignals: {
          source: "Recommendation",
          recommendationId: rec.id,
          insightId: rec.insightId,
          reasonCodes: rec.reasonCodes,
          reasoning: rec.reasoning,
        },
        suggestedAction: rec.actionType,
        deepLink: rec.deepLink,
        status: "PENDING",
        metricName: OBJECTIVE_METRIC[objective],
        completedAt: null,
        skippedAt: null,
        feedback: null,
        outcomeId: null,
        generatedForDate: now(),
      });
    }

    if (projectId && input.getMemory) {
      const memory = await input.getMemory(userId, projectId);
      if (memory) drafts.push(...memoryActions(userId, projectId, memory));
    }

    drafts.sort((a, b) => b.priority - a.priority);
    const top = drafts.slice(0, maxActions);
    const saved: DailyActionRecord[] = [];
    for (const draft of top) {
      saved.push(await input.dailyActions.save(draft));
    }

    if (saved.length > 0) {
      await eventBus.publish(
        new DailyActionsGenerated(userId, {
          userId,
          projectId: projectId ?? null,
          actionIds: saved.map((a) => a.id),
          generatedAt: now(),
        }),
      );
    }
    return saved;
  }

  async function listToday(userId: string, projectId?: string): Promise<DailyActionRecord[]> {
    const pending = await listPending(userId, projectId);
    if (pending.length > 0) return pending;
    return generate(userId, projectId);
  }

  async function listPending(userId: string, projectId?: string): Promise<DailyActionRecord[]> {
    return input.dailyActions.listPending(userId, projectId, 20);
  }

  async function complete(
    actionId: string,
    feedback?: string | null,
    userId?: string,
  ): Promise<ActionOutcomeRecord | null> {
    const action = await input.dailyActions.findById(actionId, userId);
    if (!action) return null;
    if (action.status !== "PENDING") return null;

    const metricName = action.metricName;
    const before = metricName
      ? (await input.metrics.getMetric(metricName, action.userId, action.projectId))?.value ?? null
      : null;

    const outcome = await input.actionOutcomes.save({
      actionId: action.id,
      userId: action.userId,
      projectId: action.projectId,
      metricName,
      metricBefore: before !== null ? { value: before } : null,
      metricAfter: null,
      observationWindowHours: windowHours,
      measuredAt: null,
      status: "PENDING",
    });

    await input.dailyActions.complete(actionId, action.userId, feedback ?? null, outcome.id);

    await eventBus.publish(
      new DailyActionCompleted(actionId, {
        actionId,
        userId: action.userId,
        projectId: action.projectId,
        outcomeId: outcome.id,
        observationWindowHours: windowHours,
        feedback: feedback ?? null,
      }),
    );

    if (input.enqueueMeasurement) {
      await input.enqueueMeasurement(outcome.id, outcome.userId, windowHours * 60 * 60 * 1000);
    }

    return outcome;
  }

  async function skip(actionId: string, reason?: string | null, userId?: string): Promise<void> {
    const action = await input.dailyActions.findById(actionId, userId);
    if (!action) return;
    if (action.status !== "PENDING") return;
    await input.dailyActions.skip(actionId, action.userId, reason ?? null);
    await eventBus.publish(
      new DailyActionSkipped(actionId, {
        actionId,
        userId: action.userId,
        projectId: action.projectId,
        reason: reason ?? null,
      }),
    );
  }

  return { generate, listToday, listPending, complete, skip };
}

export type DailyActionService = ReturnType<typeof makeDailyActionService>;
