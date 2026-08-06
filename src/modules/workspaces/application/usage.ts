import { OrganizationRepository, PlanConfigRepository } from "./ports";
import { Plan, PlanLimits, isWithinLimit, PLAN_LIMITS } from "../domain/plan";

export function makeOrganizationUsageService(deps: {
  organizations: OrganizationRepository;
  planConfigs: PlanConfigRepository;
}) {
  async function resolveLimits(plan: Plan): Promise<PlanLimits> {
    const config = await deps.planConfigs.findByPlan(plan);
    if (config && !config.isDefault) {
      return {
        maxWorkspaces: config.maxWorkspaces,
        maxProjects: config.maxProjects,
        maxStores: config.maxStores,
        monthlyAiReplies: config.monthlyAiReplies,
        teamSeats: config.teamSeats,
        maxProfileInspectionsPerDay: config.maxProfileInspectionsPerDay,
        maxCompetitors: config.maxCompetitors,
        maxAttributionLinksPerMonth: config.maxAttributionLinksPerMonth,
        maxContentSchedulesPerMonth: config.maxContentSchedulesPerMonth,
        allowedModels: config.allowedModels,
      };
    }
    return PLAN_LIMITS[plan];
  }

  return {
    /**
     * Attempt to consume one AI reply for the organization.
     * Returns `true` when the request is within the plan's monthly limit and
     * the atomic counter was incremented, `false` otherwise.
     */
    async consumeAIReply(userId: string): Promise<boolean> {
      const org = await deps.organizations.findById(userId);
      if (!org) return false;
      const { monthlyAiReplies } = await resolveLimits(org.plan as Plan);
      return deps.organizations.incrementAIReplies(userId, monthlyAiReplies);
    },

    /**
     * Attempt to consume one profile inspection for the organization.
     * Returns `true` when the request is within the plan's daily limit and
     * the atomic counter was incremented, `false` otherwise.
     */
    async consumeProfileInspection(userId: string): Promise<boolean> {
      const org = await deps.organizations.findById(userId);
      if (!org) return false;
      const { maxProfileInspectionsPerDay } = await resolveLimits(org.plan as Plan);
      return deps.organizations.incrementProfileInspections(userId, maxProfileInspectionsPerDay);
    },

    /**
     * Checks whether `currentUsage` is still below the named plan limit for the organization.
     * Returns the resolved limit and whether the operation is allowed.
     */
    async checkLimit(
      userId: string,
      currentUsage: number,
      limitKey: keyof PlanLimits,
    ): Promise<{ allowed: boolean; limit: number | null }> {
      const org = await deps.organizations.findById(userId);
      if (!org) return { allowed: false, limit: null };
      const limits = await resolveLimits(org.plan as Plan);
      const limit = limits[limitKey];
      const numericLimit = typeof limit === "number" ? limit : null;
      return { allowed: isWithinLimit(numericLimit, currentUsage), limit: numericLimit };
    },

    /**
     * Returns the full plan limits for the organization.
     */
    async getPlanLimits(userId: string): Promise<PlanLimits | null> {
      const org = await deps.organizations.findById(userId);
      if (!org) return null;
      return resolveLimits(org.plan as Plan);
    },
  };
}
