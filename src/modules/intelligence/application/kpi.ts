import type { KpiRepository, KpiSnapshot } from "./ports";

export interface KpiServiceInput {
  kpis: KpiRepository;
}

export function makeKpiService(input: KpiServiceInput) {
  return {
    async getWorkspaceSnapshot(
      organizationId: string,
      storeId?: string,
      period: KpiSnapshot["period"] = "7d",
    ): Promise<KpiSnapshot> {
      return input.kpis.getWorkspaceSnapshot(organizationId, storeId ?? null, period);
    },
  };
}

export type KpiService = ReturnType<typeof makeKpiService>;
