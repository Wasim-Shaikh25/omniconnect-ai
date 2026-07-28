import { prisma } from "@/shared/database";
import type { Role } from "@/modules/auth";
import { PaginationInput, paginatedResult, toSkip } from "@/shared/kernel";
import { UserProfile, UserProfileRepository } from "../application/ports";

type PrismaUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  isSuperAdmin: boolean;
  organizationId: string | null;
  storeId: string | null;
};

function toProfile(user: PrismaUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role as Role,
    isSuperAdmin: user.isSuperAdmin,
    organizationId: user.organizationId,
    storeId: user.storeId,
  };
}

export class PrismaUserProfileRepository implements UserProfileRepository {
  async findById(id: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toProfile(user) : null;
  }

  async updateProfile(
    id: string,
    data: { name?: string | null; image?: string | null },
  ): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id },
      data: { name: data.name, image: data.image },
    });
    return toProfile(user);
  }

  async setOrganization(id: string, organizationId: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { organizationId, tokenVersion: { increment: 1 } },
    });
  }

  async setRole(id: string, role: Role): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id },
      data: { role, tokenVersion: { increment: 1 } },
    });
    return toProfile(user);
  }

  async listByOrganization(
    organizationId: string,
    pagination?: PaginationInput,
  ) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
        ...(pagination
          ? { skip: toSkip(pagination), take: pagination.limit }
          : {}),
      }),
      prisma.user.count({ where: { organizationId } }),
    ]);
    return paginatedResult(
      users.map(toProfile),
      total,
      pagination ?? { page: 1, limit: total || 1 },
    );
  }

  async listAll(pagination?: PaginationInput) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        ...(pagination
          ? { skip: toSkip(pagination), take: pagination.limit }
          : {}),
      }),
      prisma.user.count(),
    ]);
    return paginatedResult(
      users.map(toProfile),
      total,
      pagination ?? { page: 1, limit: total || 1 },
    );
  }

  async setSuperAdmin(id: string, isSuperAdmin: boolean): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id },
      data: { isSuperAdmin, tokenVersion: { increment: 1 } },
    });
    return toProfile(user);
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return prisma.user.count({ where: { organizationId } });
  }
}
