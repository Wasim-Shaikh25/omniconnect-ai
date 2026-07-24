import { prisma } from "@/shared/database";
import {
  OrganizationRecord,
  OrganizationRepository,
} from "../application/ports";

export class PrismaOrganizationRepository implements OrganizationRepository {
  async create(input: { name: string }): Promise<OrganizationRecord> {
    const org = await prisma.organization.create({ data: { name: input.name } });
    return { id: org.id, name: org.name, createdAt: org.createdAt };
  }

  async findById(id: string): Promise<OrganizationRecord | null> {
    const org = await prisma.organization.findUnique({ where: { id } });
    return org ? { id: org.id, name: org.name, createdAt: org.createdAt } : null;
  }
}
