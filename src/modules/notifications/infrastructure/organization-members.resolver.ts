import { prisma } from "@/shared/database";
import type { OrganizationMembersResolver } from "../application/ports";

export class PrismaOrganizationMembersResolver
  implements OrganizationMembersResolver
{
  async getUserIdsForStore(storeId: string): Promise<string[]> {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { organizationId: true },
    });
    if (!store?.organizationId) return [];

    const users = await prisma.user.findMany({
      where: { organizationId: store.organizationId },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
}
