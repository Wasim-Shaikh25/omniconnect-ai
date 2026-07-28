import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import type {
  IntelligenceFeedbackRepository,
  IntelligenceDismissalRepository,
  GoalPlanRepository,
  RolloutGateRepository,
} from "../application/ports";
import type {
  IntelligenceFeedbackRecord,
  IntelligenceDismissalRecord,
  GoalPlanRecord,
  GoalPlanStatus,
  GoalPlanPostLaunchRecommendation,
  RolloutMode,
  RolloutGateRecord,
} from "../domain/types";

type StoredFeedback = {
  id: string;
  organizationId: string;
  insightId: string;
  userId: string;
  understood: boolean;
  hoursSaved: number;
  falsePositive: boolean;
  falseNegative: boolean;
  createdAt: Date;
};

function toFeedbackRecord(row: StoredFeedback): IntelligenceFeedbackRecord {
  return { ...row };
}

export class PrismaIntelligenceFeedbackRepository implements IntelligenceFeedbackRepository {
  async save(
    record: Omit<IntelligenceFeedbackRecord, "id" | "organizationId" | "createdAt">,
    organizationId: string,
  ): Promise<IntelligenceFeedbackRecord> {
    const created = await prisma.intelligenceFeedback.create({
      data: { ...record, organizationId } as Prisma.IntelligenceFeedbackCreateInput,
    });
    return toFeedbackRecord(created as StoredFeedback);
  }

  async getKpis(
    organizationId: string,
  ): Promise<{ total: number; understoodRate: number; hoursSaved: number; falsePositiveRate: number; falseNegativeRate: number }> {
    const rows = await prisma.intelligenceFeedback.findMany({ where: { organizationId } });
    const total = rows.length;
    if (total === 0) {
      return { total: 0, understoodRate: 0, hoursSaved: 0, falsePositiveRate: 0, falseNegativeRate: 0 };
    }
    const understood = rows.filter((r) => r.understood).length;
    const falsePositive = rows.filter((r) => r.falsePositive).length;
    const falseNegative = rows.filter((r) => r.falseNegative).length;
    const hoursSaved = rows.reduce((s, r) => s + r.hoursSaved, 0);
    return {
      total,
      understoodRate: understood / total,
      hoursSaved,
      falsePositiveRate: falsePositive / total,
      falseNegativeRate: falseNegative / total,
    };
  }
}

type StoredDismissal = {
  id: string;
  organizationId: string;
  insightId: string;
  reason: string;
  userId: string;
  dismissedAt: Date;
};

function toDismissalRecord(row: StoredDismissal): IntelligenceDismissalRecord {
  return { ...row };
}

export class PrismaIntelligenceDismissalRepository implements IntelligenceDismissalRepository {
  async dismiss(input: {
    insightId: string;
    organizationId: string;
    userId: string;
    reason: string;
  }): Promise<IntelligenceDismissalRecord> {
    const upserted = await prisma.intelligenceDismissal.upsert({
      where: { insightId: input.insightId },
      create: {
        organizationId: input.organizationId,
        insightId: input.insightId,
        reason: input.reason,
        userId: input.userId,
        dismissedAt: new Date(),
      },
      update: {
        reason: input.reason,
        userId: input.userId,
        dismissedAt: new Date(),
      },
    });
    return toDismissalRecord(upserted as StoredDismissal);
  }

  async getReason(insightId: string, organizationId: string): Promise<string | null> {
    const row = await prisma.intelligenceDismissal.findFirst({
      where: { insightId, organizationId },
    });
    return row?.reason ?? null;
  }
}

type StoredGoalPlanVersion = {
  id: string;
  goalId: string;
  organizationId: string;
  version: number;
  workflowId: string;
  status: string;
  holdoutPct: number;
  postLaunchRecommendation: string;
  createdAt: Date;
  updatedAt: Date;
};

function toGoalPlanRecord(row: StoredGoalPlanVersion): GoalPlanRecord {
  return {
    ...row,
    status: row.status as GoalPlanStatus,
    postLaunchRecommendation: row.postLaunchRecommendation as GoalPlanPostLaunchRecommendation,
    testRunResult: { ok: true, issues: [] },
  };
}

export class PrismaGoalPlanRepository implements GoalPlanRepository {
  async create(goalId: string, organizationId: string): Promise<GoalPlanRecord> {
    const existing = await prisma.goalPlanVersion.findMany({
      where: { goalId, organizationId },
      orderBy: { version: "desc" },
      take: 1,
    });
    const version = (existing[0]?.version ?? 0) + 1;
    const workflowId = `wf-${goalId}-v${version}`;
    const created = await prisma.goalPlanVersion.create({
      data: {
        goalId,
        organizationId,
        version,
        workflowId,
        status: "draft",
        holdoutPct: 10,
        postLaunchRecommendation: "continue",
      },
    });
    return toGoalPlanRecord(created as StoredGoalPlanVersion);
  }

  async testRun(workflowId: string, organizationId: string): Promise<GoalPlanRecord | null> {
    const existing = await prisma.goalPlanVersion.findFirst({ where: { workflowId, organizationId } });
    if (!existing) return null;
    const updated = await prisma.goalPlanVersion.update({
      where: { id: existing.id },
      data: { status: "test" },
    });
    return toGoalPlanRecord(updated as StoredGoalPlanVersion);
  }

  async launchWithHoldout(
    workflowId: string,
    organizationId: string,
    holdoutPct: number,
  ): Promise<GoalPlanRecord | null> {
    const existing = await prisma.goalPlanVersion.findFirst({ where: { workflowId, organizationId } });
    if (!existing) return null;
    const updated = await prisma.goalPlanVersion.update({
      where: { id: existing.id },
      data: { status: "live", holdoutPct, postLaunchRecommendation: "continue" },
    });
    return toGoalPlanRecord(updated as StoredGoalPlanVersion);
  }

  async getPlan(workflowId: string, organizationId: string): Promise<GoalPlanRecord | null> {
    const row = await prisma.goalPlanVersion.findFirst({ where: { workflowId, organizationId } });
    return row ? toGoalPlanRecord(row as StoredGoalPlanVersion) : null;
  }

  async postLaunch(
    workflowId: string,
    organizationId: string,
    recommendation: GoalPlanPostLaunchRecommendation,
  ): Promise<GoalPlanRecord | null> {
    const existing = await prisma.goalPlanVersion.findFirst({ where: { workflowId, organizationId } });
    if (!existing) return null;
    const status = recommendation === "pause" ? "paused" : recommendation === "conclude" ? "concluded" : undefined;
    const data: Prisma.GoalPlanVersionUpdateInput = { postLaunchRecommendation: recommendation };
    if (status) data.status = status;
    const updated = await prisma.goalPlanVersion.update({
      where: { id: existing.id },
      data,
    });
    return toGoalPlanRecord(updated as StoredGoalPlanVersion);
  }
}

const DEFAULT_GATES: Record<RolloutMode, Omit<RolloutGateRecord, "id" | "organizationId" | "updatedAt">> = {
  SHADOW: {
    name: "SHADOW",
    enabled: true,
    canExecuteOutboundActions: false,
    allowedEnvironments: ["test"],
    maxRiskTier: "TIER_1",
    requiresApproval: true,
  },
  INTERNAL: {
    name: "INTERNAL",
    enabled: false,
    canExecuteOutboundActions: false,
    allowedEnvironments: ["test", "staging"],
    maxRiskTier: "TIER_2",
    requiresApproval: true,
  },
  PILOT: {
    name: "PILOT",
    enabled: false,
    canExecuteOutboundActions: true,
    allowedEnvironments: ["staging", "production"],
    maxRiskTier: "TIER_3",
    requiresApproval: true,
  },
  BETA: {
    name: "BETA",
    enabled: false,
    canExecuteOutboundActions: true,
    allowedEnvironments: ["production"],
    maxRiskTier: "TIER_4",
    requiresApproval: true,
  },
  GA: {
    name: "GA",
    enabled: false,
    canExecuteOutboundActions: true,
    allowedEnvironments: ["production"],
    maxRiskTier: "TIER_4",
    requiresApproval: false,
  },
};

function toRolloutGateRecord(
  row: { id: string; organizationId: string; name: string; enabled: boolean; updatedAt: Date } | null,
  name: RolloutMode,
  organizationId: string,
): RolloutGateRecord {
  const defaults = DEFAULT_GATES[name];
  if (!row) {
    return { id: "", organizationId, ...defaults, updatedAt: new Date() };
  }
  return { ...defaults, ...row, name, organizationId };
}

export class PrismaRolloutGateRepository implements RolloutGateRepository {
  async getGates(organizationId: string): Promise<RolloutGateRecord[]> {
    const rows = await prisma.rolloutGate.findMany({ where: { organizationId } });
    const byName = new Map(rows.map((r) => [r.name as RolloutMode, r]));
    return (Object.keys(DEFAULT_GATES) as RolloutMode[]).map((name) =>
      toRolloutGateRecord(byName.get(name) ?? null, name, organizationId),
    );
  }

  async getGate(name: RolloutMode, organizationId: string): Promise<RolloutGateRecord | null> {
    const row = await prisma.rolloutGate.findUnique({ where: { organizationId_name: { organizationId, name } } });
    return toRolloutGateRecord(row ?? null, name, organizationId);
  }

  async setGate(name: RolloutMode, organizationId: string, enabled: boolean): Promise<RolloutGateRecord> {
    const row = await prisma.rolloutGate.upsert({
      where: { organizationId_name: { organizationId, name } },
      create: { organizationId, name, enabled },
      update: { enabled },
    });
    return toRolloutGateRecord(row, name, organizationId);
  }
}
