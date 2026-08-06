import { describe, it, expect } from "vitest";
import { makeOrganizationUsageService } from "./usage";
import type { OrganizationRepository, PlanConfigInput, PlanConfigRepository } from "./ports";
import { Plan } from "../domain/plan";

function makeRepository(plan: Plan): OrganizationRepository {
  return {
    findById: async () => ({ id: "org_1", name: "Test", plan, subscriptionId: null, subscriptionStatus: "active", createdAt: new Date() }),
    create: async () => ({ id: "org_1", name: "Test", plan: Plan.FREE, subscriptionId: null, subscriptionStatus: null, createdAt: new Date() }),
    findBySubscriptionId: async () => null,
    listAll: async () => ({ items: [], total: 0, hasMore: false, cursor: null }),
    updatePlan: async () => null,
    incrementAIReplies: async () => true,
    incrementProfileInspections: async () => true,
  } as unknown as OrganizationRepository;
}

function makePlanConfigRepo(): PlanConfigRepository {
  return {
    list: async () => [],
    findByPlan: async () => null,
    upsert: async (input: PlanConfigInput) => ({ id: "pc-1", ...input, createdAt: new Date(), updatedAt: new Date() } as unknown as Awaited<ReturnType<PlanConfigRepository["upsert"]>>),
  } as unknown as PlanConfigRepository;
}

describe("organizationUsage.checkLimit", () => {
  it("allows usage below the plan limit", async () => {
    const usage = makeOrganizationUsageService({ organizations: makeRepository(Plan.PRO), planConfigs: makePlanConfigRepo() });
    const result = await usage.checkLimit("org_1", 5, "maxCompetitors");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
  });

  it("denies usage at or above the plan limit", async () => {
    const usage = makeOrganizationUsageService({ organizations: makeRepository(Plan.FREE), planConfigs: makePlanConfigRepo() });
    const result = await usage.checkLimit("org_1", 1, "maxCompetitors");
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(1);
  });

  it("returns null limit and true for unlimited Business plans", async () => {
    const usage = makeOrganizationUsageService({ organizations: makeRepository(Plan.BUSINESS), planConfigs: makePlanConfigRepo() });
    const result = await usage.checkLimit("org_1", 999, "maxCompetitors");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
  });

  it("returns allowed false when the organization is not found", async () => {
    const usage = makeOrganizationUsageService({
      organizations: { findById: async () => null } as unknown as OrganizationRepository,
      planConfigs: makePlanConfigRepo(),
    });
    const result = await usage.checkLimit("missing", 0, "maxCompetitors");
    expect(result.allowed).toBe(false);
    expect(result.limit).toBeNull();
  });
});

describe("organizationUsage.getPlanLimits", () => {
  it("returns the full limits for the organization's plan", async () => {
    const usage = makeOrganizationUsageService({ organizations: makeRepository(Plan.PRO), planConfigs: makePlanConfigRepo() });
    const limits = await usage.getPlanLimits("org_1");
    expect(limits).not.toBeNull();
    expect(limits?.maxCompetitors).toBe(10);
    expect(limits?.allowedModels.length).toBeGreaterThan(0);
  });
});
