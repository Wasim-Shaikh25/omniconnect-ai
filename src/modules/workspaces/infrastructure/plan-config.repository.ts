import { prisma } from "@/shared/database";
import type { Plan } from "../domain/plan";
import type { PlanConfigRepository, PlanConfigRecord, PlanConfigInput } from "../application/ports";

export class PrismaPlanConfigRepository implements PlanConfigRepository {
  async list(): Promise<PlanConfigRecord[]> {
    const rows = await prisma.planConfig.findMany({ orderBy: { plan: "asc" } });
    return rows.map(toRecord);
  }

  async findByPlan(plan: Plan): Promise<PlanConfigRecord | null> {
    const row = await prisma.planConfig.findUnique({ where: { plan } });
    return row ? toRecord(row) : null;
  }

  async upsert(input: PlanConfigInput): Promise<PlanConfigRecord> {
    const row = await prisma.planConfig.upsert({
      where: { plan: input.plan },
      create: {
        plan: input.plan,
        maxWorkspaces: input.maxWorkspaces ?? null,
        maxProjects: input.maxProjects ?? null,
        monthlyAiReplies: input.monthlyAiReplies ?? null,
        maxProfileInspectionsPerDay: input.maxProfileInspectionsPerDay ?? null,
        teamSeats: input.teamSeats ?? null,
        maxStores: input.maxStores ?? null,
        maxCompetitors: input.maxCompetitors ?? null,
        maxAttributionLinksPerMonth: input.maxAttributionLinksPerMonth ?? null,
        maxContentSchedulesPerMonth: input.maxContentSchedulesPerMonth ?? null,
        allowedModels: input.allowedModels,
        priceMonthlyCents: input.priceMonthlyCents ?? 0,
        isDefault: input.isDefault ?? false,
      },
      update: {
        maxWorkspaces: input.maxWorkspaces ?? null,
        maxProjects: input.maxProjects ?? null,
        monthlyAiReplies: input.monthlyAiReplies ?? null,
        maxProfileInspectionsPerDay: input.maxProfileInspectionsPerDay ?? null,
        teamSeats: input.teamSeats ?? null,
        maxStores: input.maxStores ?? null,
        maxCompetitors: input.maxCompetitors ?? null,
        maxAttributionLinksPerMonth: input.maxAttributionLinksPerMonth ?? null,
        maxContentSchedulesPerMonth: input.maxContentSchedulesPerMonth ?? null,
        allowedModels: input.allowedModels,
        priceMonthlyCents: input.priceMonthlyCents ?? 0,
        isDefault: input.isDefault ?? false,
      },
    });
    return toRecord(row);
  }
}

function toRecord(row: {
  id: string;
  plan: string;
  maxWorkspaces: number | null;
  maxProjects: number | null;
  monthlyAiReplies: number | null;
  maxProfileInspectionsPerDay: number | null;
  teamSeats: number | null;
  maxStores: number | null;
  maxCompetitors: number | null;
  maxAttributionLinksPerMonth: number | null;
  maxContentSchedulesPerMonth: number | null;
  allowedModels: string[];
  priceMonthlyCents: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PlanConfigRecord {
  return {
    id: row.id,
    plan: row.plan as Plan,
    maxWorkspaces: row.maxWorkspaces,
    maxProjects: row.maxProjects,
    monthlyAiReplies: row.monthlyAiReplies,
    maxProfileInspectionsPerDay: row.maxProfileInspectionsPerDay,
    teamSeats: row.teamSeats,
    maxStores: row.maxStores,
    maxCompetitors: row.maxCompetitors,
    maxAttributionLinksPerMonth: row.maxAttributionLinksPerMonth,
    maxContentSchedulesPerMonth: row.maxContentSchedulesPerMonth,
    allowedModels: row.allowedModels,
    priceMonthlyCents: row.priceMonthlyCents,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
