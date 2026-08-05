import type { KpiRepository, KpiSnapshot } from "./ports";

export interface KpiServiceInput {
  kpis: KpiRepository;
}

export function makeKpiService(input: KpiServiceInput) {
  return {
    async getWorkspaceSnapshot(
      userId: string,
      projectId?: string,
      period: KpiSnapshot["period"] = "7d",
    ): Promise<KpiSnapshot> {
      return input.kpis.getWorkspaceSnapshot(userId, projectId ?? null, period);
    },
  };
}

export type KpiService = ReturnType<typeof makeKpiService>;
