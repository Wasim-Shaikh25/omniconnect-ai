import { prisma } from "@/shared/database";
import type { Role } from "@/modules/auth";
import type {
  OrganizationInviteRecord,
  OrganizationInviteRepository,
} from "../application/ports";
import type { InviteStatus } from "../domain/invite";

function toRecord(row: {
  id: string;
  email: string;
  organizationId: string;
  role: Role;
  status: InviteStatus;
  token: string;
  createdByUserId: string;
  createdAt: Date;
  expiresAt: Date;
}): OrganizationInviteRecord {
  return {
    id: row.id,
    email: row.email,
    organizationId: row.organizationId,
    role: row.role,
    status: row.status,
    token: row.token,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

export class PrismaOrganizationInviteRepository
  implements OrganizationInviteRepository
{
  async findByToken(token: string): Promise<OrganizationInviteRecord | null> {
    const row = await prisma.organizationInvite.findUnique({ where: { token } });
    return row ? toRecord(row as OrganizationInviteRecord) : null;
  }

  async findPendingByEmail(
    organizationId: string,
    email: string,
  ): Promise<OrganizationInviteRecord | null> {
    const row = await prisma.organizationInvite.findUnique({
      where: { organizationId_email: { organizationId, email } },
    });
    if (!row || row.status !== "PENDING") return null;
    return toRecord(row as OrganizationInviteRecord);
  }

  async create(
    input: Omit<OrganizationInviteRecord, "id" | "createdAt" | "status"> & {
      status?: InviteStatus;
    },
  ): Promise<OrganizationInviteRecord> {
    const row = await prisma.organizationInvite.create({
      data: {
        email: input.email,
        organizationId: input.organizationId,
        role: input.role,
        status: input.status ?? "PENDING",
        token: input.token,
        createdByUserId: input.createdByUserId,
        expiresAt: input.expiresAt,
      },
    });
    return toRecord(row as OrganizationInviteRecord);
  }

  async updateStatus(id: string, status: InviteStatus): Promise<OrganizationInviteRecord> {
    const row = await prisma.organizationInvite.update({ where: { id }, data: { status } });
    return toRecord(row as OrganizationInviteRecord);
  }

  async countPendingByOrganization(organizationId: string): Promise<number> {
    return prisma.organizationInvite.count({
      where: { organizationId, status: "PENDING" },
    });
  }

  async listPendingByOrganization(
    organizationId: string,
    limit = 100,
  ): Promise<OrganizationInviteRecord[]> {
    const rows = await prisma.organizationInvite.findMany({
      where: { organizationId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toRecord(r as OrganizationInviteRecord));
  }
}
