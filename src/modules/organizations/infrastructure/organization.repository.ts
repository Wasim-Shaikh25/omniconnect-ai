import { prisma } from "@/shared/database";
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
}
