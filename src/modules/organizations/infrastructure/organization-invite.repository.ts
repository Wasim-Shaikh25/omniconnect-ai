import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import type { Role } from "@/modules/auth";
import type {
  CreateInviteInput,
  CreateInviteResult,
  OrganizationInviteRecord,
  OrganizationInviteRepository,
} from "../application/ports";
import type { InviteStatus } from "../domain/invite";

function toRecord(row: {
  id: string;
  email: string;
  organizationId: string;
  role: Role;
  storeId: string | null;
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
    storeId: row.storeId,
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

  async findById(
    id: string,
    organizationId: string,
  ): Promise<OrganizationInviteRecord | null> {
    const row = await prisma.organizationInvite.findFirst({
      where: { id, organizationId },
    });
    return row ? toRecord(row as OrganizationInviteRecord) : null;
  }

  async create(
    input: CreateInviteInput,
  ): Promise<OrganizationInviteRecord> {
    const row = await prisma.organizationInvite.create({
      data: {
        email: input.email,
        organizationId: input.organizationId,
        role: input.role,
        storeId: input.storeId,
        status: input.status ?? "PENDING",
        token: input.token,
        createdByUserId: input.createdByUserId,
        expiresAt: input.expiresAt,
      },
    });
    return toRecord(row as OrganizationInviteRecord);
  }

  async createWithinSeatLimit(
    input: CreateInviteInput,
    teamSeats: number | null,
  ): Promise<CreateInviteResult> {
    const maxAttempts = 3;
    let attempt = 0;

    while (true) {
      attempt += 1;
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            if (teamSeats !== null) {
              const [userCount, pendingCount] = await Promise.all([
                tx.user.count({
                  where: { organizationId: input.organizationId, deletedAt: null },
                }),
                tx.organizationInvite.count({
                  where: {
                    organizationId: input.organizationId,
                    status: "PENDING",
                    expiresAt: { gt: new Date() },
                  },
                }),
              ]);

              if (userCount + pendingCount >= teamSeats) {
                return {
                  ok: false as const,
                  reason: "seat_limit" as const,
                  limit: teamSeats,
                };
              }
            }

            const invite = await tx.organizationInvite.create({
              data: {
                email: input.email,
                organizationId: input.organizationId,
                role: input.role,
                storeId: input.storeId,
                status: input.status ?? "PENDING",
                token: input.token,
                createdByUserId: input.createdByUserId,
                expiresAt: input.expiresAt,
              },
            });
            return { ok: true as const, invite: toRecord(invite as OrganizationInviteRecord) };
          },
          { isolationLevel: "Serializable" },
        );

        return result;
      } catch (error) {
        const isSerializationFailure =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (isSerializationFailure && attempt < maxAttempts) {
          continue;
        }
        throw error;
      }
    }
  }

  async updateStatus(id: string, status: InviteStatus): Promise<OrganizationInviteRecord> {
    const row = await prisma.organizationInvite.update({ where: { id }, data: { status } });
    return toRecord(row as OrganizationInviteRecord);
  }

  async updateToken(
    id: string,
    organizationId: string,
    token: string,
    expiresAt: Date,
  ): Promise<OrganizationInviteRecord | null> {
    const row = await prisma.organizationInvite.update({
      where: { id, organizationId },
      data: { token, expiresAt },
    });
    return row ? toRecord(row as OrganizationInviteRecord) : null;
  }

  async deleteInvite(id: string, organizationId: string): Promise<void> {
    await prisma.organizationInvite.deleteMany({ where: { id, organizationId } });
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
