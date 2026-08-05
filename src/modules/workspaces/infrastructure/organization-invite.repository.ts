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
  userId: string;
  role: string;
  projectId: string | null;
  status: string;
  token: string;
  createdByUserId: string;
  createdAt: Date;
  expiresAt: Date;
}): OrganizationInviteRecord {
  return {
    id: row.id,
    email: row.email,
    userId: row.userId,
    role: row.role as Role,
    projectId: row.projectId,
    status: row.status as InviteStatus,
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
    return row ? toRecord(row) : null;
  }

  async findPendingByEmail(
    userId: string,
    email: string,
  ): Promise<OrganizationInviteRecord | null> {
    const row = await prisma.organizationInvite.findUnique({
      where: { organizationId_email: { userId, email } },
    });
    if (!row || row.status !== "PENDING") return null;
    return toRecord(row);
  }

  async findById(
    id: string,
    userId: string,
  ): Promise<OrganizationInviteRecord | null> {
    const row = await prisma.organizationInvite.findFirst({
      where: { id, userId },
    });
    return row ? toRecord(row) : null;
  }

  async create(
    input: CreateInviteInput,
  ): Promise<OrganizationInviteRecord> {
    const row = await prisma.organizationInvite.create({
      data: {
        email: input.email,
        userId: input.userId,
        role: input.role,
        projectId: input.projectId,
        status: input.status ?? "PENDING",
        token: input.token,
        createdByUserId: input.createdByUserId,
        expiresAt: input.expiresAt,
      },
    });
    return toRecord(row);
  }

  async createWithinSeatLimit(
    input: CreateInviteInput,
    teamSeats: number | null,
    now?: Date,
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
                  where: { id: input.userId, deletedAt: null },
                }),
                tx.organizationInvite.count({
                  where: {
                    userId: input.userId,
                    status: "PENDING",
                    expiresAt: { gt: now ?? new Date() },
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
                userId: input.userId,
                role: input.role,
                projectId: input.projectId,
                status: input.status ?? "PENDING",
                token: input.token,
                createdByUserId: input.createdByUserId,
                expiresAt: input.expiresAt,
              },
            });
            return { ok: true as const, invite: toRecord(invite) };
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
    return toRecord(row);
  }

  async updateToken(
    id: string,
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<OrganizationInviteRecord | null> {
    const row = await prisma.organizationInvite.update({
      where: { id, userId },
      data: { token, expiresAt },
    });
    return row ? toRecord(row) : null;
  }

  async deleteInvite(id: string, userId: string): Promise<void> {
    await prisma.organizationInvite.deleteMany({ where: { id, userId } });
  }

  async countPendingByOrganization(userId: string): Promise<number> {
    return prisma.organizationInvite.count({
      where: { userId, status: "PENDING" },
    });
  }

  async listPendingByOrganization(
    userId: string,
    limit = 100,
  ): Promise<OrganizationInviteRecord[]> {
    const rows = await prisma.organizationInvite.findMany({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toRecord(r));
  }
}
