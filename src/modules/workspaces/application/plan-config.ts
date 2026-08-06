import { Plan, PLAN_LIMITS, PlanLimits } from "../domain/plan";
import type { PlanConfigRepository, PlanConfigRecord, PlanConfigInput } from "./ports";

export interface PlanConfigService {
  list(): Promise<PlanConfigRecord[]>;
  resolveLimits(plan: Plan): Promise<PlanLimits>;
  upsert(input: PlanConfigInput): Promise<PlanConfigRecord>;
}

export function makePlanConfigService(deps: {
  planConfigs: PlanConfigRepository;
}): PlanConfigService {
  return {
    async list() {
      const configs = await deps.planConfigs.list();
      const defaults = Object.values(Plan).map((plan) => ({
        plan,
        limits: PLAN_LIMITS[plan],
      }));
      const byPlan = new Map(configs.map((c) => [c.plan, c]));
      return defaults.map(({ plan, limits }) => {
        const config = byPlan.get(plan);
        return config
          ? config
          : {
              id: "",
              plan,
              ...limits,
              priceMonthlyCents: 0,
              isDefault: true,
              createdAt: new Date(0),
              updatedAt: new Date(0),
            };
      });
    },

    async resolveLimits(plan: Plan): Promise<PlanLimits> {
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
    },

    async upsert(input: PlanConfigInput) {
      return deps.planConfigs.upsert({ ...input, isDefault: false });
    },
  };
}
