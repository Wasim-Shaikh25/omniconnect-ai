import { prisma } from "@/shared/database";
import { logger } from "@/shared/observability";
import { PaginationInput, paginatedResult, toSkip } from "@/shared/kernel";
import { Plan, parsePlan } from "../domain/plan";
import {
  OrganizationRecord,
  OrganizationRepository,
} from "../application/ports";

function mapOrg(org: {
  id: string;
  name: string;
  plan: string;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  createdAt: Date;
}): OrganizationRecord {
  return {
    id: org.id,
    name: org.name,
    plan: parsePlan(org.plan),
    subscriptionId: org.subscriptionId,
    subscriptionStatus: org.subscriptionStatus,
    createdAt: org.createdAt,
  };
}

export class PrismaOrganizationRepository implements OrganizationRepository {
  async create(input: { name: string }): Promise<OrganizationRecord> {
    const org = await prisma.organization.create({ data: { name: input.name } });
    return mapOrg(org);
  }

  async findById(id: string): Promise<OrganizationRecord | null> {
    const org = await prisma.organization.findUnique({ where: { id } });
    return org ? mapOrg(org) : null;
  }

  async findBySubscriptionId(subscriptionId: string): Promise<OrganizationRecord | null> {
    const org = await prisma.organization.findUnique({ where: { subscriptionId } });
    return org ? mapOrg(org) : null;
  }

  async listAll(pagination?: PaginationInput) {
    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        ...(pagination
          ? { skip: toSkip(pagination), take: pagination.limit }
          : {}),
      }),
      prisma.organization.count(),
    ]);
    return paginatedResult(
      orgs.map(mapOrg),
      total,
      pagination ?? { page: 1, limit: total || 1 },
    );
  }

  async updatePlan(
    id: string,
    input: { plan: Plan; subscriptionId?: string | null; subscriptionStatus?: string | null },
  ): Promise<OrganizationRecord | null> {
    const data: Record<string, unknown> = { plan: input.plan };
    if (input.subscriptionId !== undefined) data.subscriptionId = input.subscriptionId;
    if (input.subscriptionStatus !== undefined) data.subscriptionStatus = input.subscriptionStatus;
    const org = await prisma.organization.update({ where: { id }, data });
    return mapOrg(org);
  }

  async incrementAIReplies(id: string, limit: number | null): Promise<boolean> {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    try {
      return await prisma.$transaction(
        async (tx) => {
          const org = await tx.organization.findUnique({ where: { id } });
          if (!org) return false;

          let used = org.aiRepliesThisMonth;
          const resetAt = org.aiRepliesResetAt;
          if (!resetAt || resetAt < monthStart) {
            used = 0;
            await tx.organization.update({
              where: { id },
              data: { aiRepliesThisMonth: 0, aiRepliesResetAt: monthStart },
            });
          }

          if (limit !== null && used >= limit) return false;

          await tx.organization.update({
            where: { id },
            data: { aiRepliesThisMonth: { increment: 1 } },
          });
          return true;
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      logger.error("organization.incrementAIReplies.failed", {
        organizationId: id,
        error: error instanceof Error ? error.message : "unknown",
      });
      return false;
    }
  }
}
