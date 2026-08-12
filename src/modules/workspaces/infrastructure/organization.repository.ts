import type { Prisma } from "@prisma/client";
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
  name: string | null;
  plan: string;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  paymentCustomerId: string | null;
  createdAt: Date;
}): OrganizationRecord {
  return {
    id: org.id,
    name: org.name ?? "",
    plan: parsePlan(org.plan),
    subscriptionId: org.subscriptionId,
    subscriptionStatus: org.subscriptionStatus,
    paymentCustomerId: org.paymentCustomerId,
    createdAt: org.createdAt,
  };
}

function generateId(): string {
  const crypto = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function generatePlaceholderEmail(name: string): string {
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safe || "org"}-${generateId()}@example.com`;
}

export class PrismaOrganizationRepository implements OrganizationRepository {
  async create(input: { name: string; email?: string }): Promise<OrganizationRecord> {
    const org = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email ?? generatePlaceholderEmail(input.name),
        passwordHash: null,
      },
    });
    return mapOrg(org);
  }

  async findById(id: string): Promise<OrganizationRecord | null> {
    const org = await prisma.user.findUnique({ where: { id } });
    return org ? mapOrg(org) : null;
  }

  async findBySubscriptionId(
    subscriptionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<OrganizationRecord | null> {
    const client = tx ?? prisma;
    const org = await client.user.findFirst({ where: { subscriptionId } });
    return org ? mapOrg(org) : null;
  }

  async listAll(pagination?: PaginationInput) {
    const effectivePagination = pagination ?? { page: 1, limit: 100 };
    const [orgs, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        skip: toSkip(effectivePagination),
        take: effectivePagination.limit,
      }),
      prisma.user.count(),
    ]);
    return paginatedResult(
      orgs.map(mapOrg),
      total,
      effectivePagination,
    );
  }

  async updatePlan(
    id: string,
    input: { plan: Plan; subscriptionId?: string | null; subscriptionStatus?: string | null; paymentCustomerId?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<OrganizationRecord | null> {
    const client = tx ?? prisma;
    const data: Record<string, unknown> = { plan: input.plan };
    if (input.subscriptionId !== undefined) data.subscriptionId = input.subscriptionId;
    if (input.subscriptionStatus !== undefined) data.subscriptionStatus = input.subscriptionStatus;
    if (input.paymentCustomerId !== undefined) data.paymentCustomerId = input.paymentCustomerId;
    const org = await client.user.update({ where: { id }, data });
    return mapOrg(org);
  }

  async incrementAIReplies(id: string, limit: number | null): Promise<boolean> {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    try {
      return await prisma.$transaction(
        async (tx) => {
          const org = await tx.user.findUnique({ where: { id } });
          if (!org) return false;

          let used = org.aiRepliesThisMonth;
          const resetAt = org.aiRepliesResetAt;
          if (!resetAt || resetAt < monthStart) {
            used = 0;
            await tx.user.update({
              where: { id },
              data: { aiRepliesThisMonth: 0, aiRepliesResetAt: monthStart },
            });
          }

          if (limit !== null && used >= limit) return false;

          await tx.user.update({
            where: { id },
            data: { aiRepliesThisMonth: { increment: 1 } },
          });
          return true;
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      logger.error("organization.incrementAIReplies.failed", {
        userId: id,
        error: error instanceof Error ? error.message : "unknown",
      });
      return false;
    }
  }

  async incrementProfileInspections(id: string, limit: number | null): Promise<boolean> {
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    try {
      return await prisma.$transaction(
        async (tx) => {
          const org = await tx.user.findUnique({ where: { id } });
          if (!org) return false;

          let used = org.profileInspectionsToday;
          const resetAt = org.profileInspectionsResetAt;
          if (!resetAt || resetAt < dayStart) {
            used = 0;
            await tx.user.update({
              where: { id },
              data: { profileInspectionsToday: 0, profileInspectionsResetAt: dayStart },
            });
          }

          if (limit !== null && used >= limit) return false;

          await tx.user.update({
            where: { id },
            data: { profileInspectionsToday: { increment: 1 } },
          });
          return true;
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      logger.error("organization.incrementProfileInspections.failed", {
        userId: id,
        error: error instanceof Error ? error.message : "unknown",
      });
      return false;
    }
  }
}
