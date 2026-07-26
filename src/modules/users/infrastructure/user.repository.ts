import { prisma } from "@/shared/database";
import type { Role } from "@/modules/auth";
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
    await prisma.user.update({ where: { id }, data: { organizationId } });
  }

  async setRole(id: string, role: Role): Promise<UserProfile> {
    const user = await prisma.user.update({ where: { id }, data: { role } });
    return toProfile(user);
  }

  async listByOrganization(organizationId: string): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
    return users.map(toProfile);
  }

  async listAll(): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return users.map(toProfile);
  }

  async setSuperAdmin(id: string, isSuperAdmin: boolean): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id },
      data: { isSuperAdmin },
    });
    return toProfile(user);
  }
}
