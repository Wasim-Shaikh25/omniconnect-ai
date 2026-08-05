import { prisma } from "@/shared/database";
import type { OrganizationMembersResolver } from "../application/ports";

export class PrismaOrganizationMembersResolver
  implements OrganizationMembersResolver
{
  async getUserIdsForStore(projectId: string): Promise<string[]> {
    const store = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!store?.userId) return [];

    const users = await prisma.user.findMany({
      where: { userId: store.userId },
      select: { id: true },
      take: 1000,
    });
    return users.map((u) => u.id);
  }
}
