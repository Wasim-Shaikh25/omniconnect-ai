import { describe, it, expect, beforeEach } from "vitest";
import { makeDailyActionService, type RankedRecommendationLike } from "./daily-action";
import type {
  ActionOutcomeRepository,
  DailyActionRepository,
  RecommendationRepository,
} from "./ports";
import type { ActionOutcomeRecord, DailyActionRecord, RecommendationRecord } from "../domain/types";

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

function makeFakeDailyActions(): DailyActionRepository & { store: DailyActionRecord[] } {
  const store: DailyActionRecord[] = [];
  return {
    store,
    async save(action) {
      const record: DailyActionRecord = {
        ...action,
        id: nextId("action"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.push(record);
      return record;
    },
    async listPending(userId, projectId) {
      return store.filter(
        (a) =>
          a.userId === userId &&
          a.status === "PENDING" &&
          (projectId ? a.projectId === projectId : true),
      );
    },
    async listForDate(userId, _since, projectId) {
      return store.filter(
        (a) => a.userId === userId && (projectId ? a.projectId === projectId : true),
      );
    },
    async findById(id, userId) {
      return store.find((a) => a.id === id && (userId ? a.userId === userId : true)) ?? null;
    },
    async complete(id, userId, feedback, outcomeId) {
      void userId;
      const a = store.find((x) => x.id === id)!;
      a.status = "DONE";
      a.feedback = feedback;
      a.outcomeId = outcomeId;
      a.completedAt = new Date();
      return a;
    },
    async skip(id, userId, reason) {
      void userId;
      const a = store.find((x) => x.id === id)!;
      a.status = "SKIPPED";
      a.feedback = reason;
      a.skippedAt = new Date();
      return a;
    },
    async setOutcome(id, userId, outcomeId) {
      void userId;
      const a = store.find((x) => x.id === id)!;
      a.outcomeId = outcomeId;
      return a;
    },
  };
}

function makeFakeOutcomes(): ActionOutcomeRepository & { store: ActionOutcomeRecord[] } {
  const store: ActionOutcomeRecord[] = [];
  return {
    store,
    async save(outcome) {
      const record: ActionOutcomeRecord = {
        ...outcome,
        id: nextId("outcome"),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.push(record);
      return record;
    },
    async findByAction(actionId, userId) {
      return store.find((o) => o.actionId === actionId && o.userId === userId) ?? null;
    },
    async findById(id, userId) {
      return store.find((o) => o.id === id && o.userId === userId) ?? null;
    },
    async updateMeasured(id, userId, metricAfter, status, measuredAt) {
      const o = store.find((x) => x.id === id && x.userId === userId)!;
      o.metricAfter = metricAfter;
      o.status = status;
      o.measuredAt = measuredAt;
      return o;
    },
    async listPendingDue() {
      return store.filter((o) => o.status === "PENDING");
    },
  };
}

const recommendationRepoStub: RecommendationRepository = {
  save: async () => { throw new Error("not used"); },
  listOpen: async () => [],
  listActive: async () => [],
  findById: async () => null,
  updateStatus: async () => { throw new Error("not used"); },
  updateObjective: async () => null,
  updateConfidence: async () => null,
  invalidate: async () => { throw new Error("not used"); },
} as unknown as RecommendationRepository;

function rankedRec(overrides: Partial<RankedRecommendationLike>): RankedRecommendationLike {
  const base: RecommendationRecord = {
    id: nextId("rec"),
    userId: "org-1",
    projectId: "store-1",
    insightId: null,
    title: "Recommendation",
    description: "Do the thing",
    actionType: "OPEN",
    deepLink: "/somewhere",
    reasonCodes: [],
    objective: null,
    status: "OPEN",
    confidence: 0.5,
    businessObjective: null,
    reasoning: null,
    marketContext: null,
    competitorContext: null,
    selfContext: null,
    confidenceSignals: 0,
  } as unknown as RecommendationRecord;
  return { ...base, ...overrides, score: overrides.score ?? 10 };
}

describe("dailyActionService.generate", () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it("creates prioritized actions from ranked recommendations, revenue first", async () => {
    const dailyActions = makeFakeDailyActions();
    const svc = makeDailyActionService({
      dailyActions,
      actionOutcomes: makeFakeOutcomes(),
      recommendations: recommendationRepoStub,
      prioritize: async () => [
        rankedRec({ title: "Engage", businessObjective: "ENGAGEMENT", confidence: 0.5, score: 10 }),
        rankedRec({ title: "Sell", businessObjective: "REVENUE", confidence: 0.5, score: 10 }),
      ],
      metrics: { getMetric: async () => ({ value: 100 }) },
    });

    const actions = await svc.generate("org-1", "store-1");
    expect(actions.length).toBe(2);
    expect(actions[0].title).toBe("Sell");
    expect(actions[0].objective).toBe("REVENUE");
  });

  it("is idempotent per day", async () => {
    const dailyActions = makeFakeDailyActions();
    const svc = makeDailyActionService({
      dailyActions,
      actionOutcomes: makeFakeOutcomes(),
      recommendations: recommendationRepoStub,
      prioritize: async () => [rankedRec({ title: "Once" })],
      metrics: { getMetric: async () => ({ value: 1 }) },
    });

    await svc.generate("org-1", "store-1");
    await svc.generate("org-1", "store-1");
    expect(dailyActions.store.length).toBe(1);
  });
});

describe("dailyActionService.complete/skip", () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it("completing schedules a pending outcome with the before metric", async () => {
    const dailyActions = makeFakeDailyActions();
    const actionOutcomes = makeFakeOutcomes();
    const enqueued: string[] = [];
    const svc = makeDailyActionService({
      dailyActions,
      actionOutcomes,
      recommendations: recommendationRepoStub,
      prioritize: async () => [rankedRec({ title: "Sell", businessObjective: "REVENUE" })],
      metrics: { getMetric: async () => ({ value: 250 }) },
      enqueueMeasurement: async (id, userId) => { enqueued.push(id); void userId; },
    });

    const [action] = await svc.generate("org-1", "store-1");
    const outcome = await svc.complete(action.id, "done it", "org-1");

    expect(outcome).not.toBeNull();
    expect(outcome!.status).toBe("PENDING");
    expect(outcome!.metricBefore).toEqual({ value: 250 });
    expect(dailyActions.store[0].status).toBe("DONE");
    expect(enqueued).toContain(outcome!.id);
  });

  it("enforces the tenant guard on complete and skip", async () => {
    const dailyActions = makeFakeDailyActions();
    const svc = makeDailyActionService({
      dailyActions,
      actionOutcomes: makeFakeOutcomes(),
      recommendations: recommendationRepoStub,
      prioritize: async () => [rankedRec({ title: "Sell" })],
      metrics: { getMetric: async () => ({ value: 1 }) },
    });

    const [action] = await svc.generate("org-1", "store-1");
    const outcome = await svc.complete(action.id, null, "other-org");
    expect(outcome).toBeNull();
    expect(dailyActions.store[0].status).toBe("PENDING");

    await svc.skip(action.id, null, "other-org");
    expect(dailyActions.store[0].status).toBe("PENDING");
  });
});
