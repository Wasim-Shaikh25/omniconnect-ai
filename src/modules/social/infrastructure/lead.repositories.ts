import { prisma } from "@/shared/database";
import type { Prisma } from "@prisma/client";
import { LeadSource, LeadStatus } from "@prisma/client";
import type { LeadRepository, SocialLeadRecord } from "../application/lead.ports";

export class PrismaLeadRepository implements LeadRepository {
  async create(input: {
    projectId: string;
    source: string;
    externalFormId?: string | null;
    externalLeadId?: string | null;
    payload?: unknown;
    mappedFields?: unknown;
    status?: string;
    score?: number;
    customerId?: string | null;
  }): Promise<SocialLeadRecord> {
    const created = await prisma.socialLead.create({
      data: {
        projectId: input.projectId,
        source: input.source as LeadSource,
        externalFormId: input.externalFormId ?? null,
        externalLeadId: input.externalLeadId ?? null,
        payload: input.payload as Prisma.InputJsonValue,
        mappedFields: input.mappedFields as Prisma.InputJsonValue,
        status: (input.status ?? "NEW") as LeadStatus,
        score: input.score ?? 0,
        customerId: input.customerId ?? null,
      },
    });
    return toRecord(created);
  }

  async listByStore(projectId: string, limit = 50): Promise<SocialLeadRecord[]> {
    const rows = await prisma.socialLead.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async updateScore(
    id: string,
    score: number,
    status: string,
  ): Promise<SocialLeadRecord> {
    const updated = await prisma.socialLead.update({
      where: { id },
      data: { score, status: status as LeadStatus },
    });
    return toRecord(updated);
  }
}

function toRecord(row: {
  id: string;
  projectId: string;
  source: string;
  externalFormId: string | null;
  externalLeadId: string | null;
  payload: unknown;
  mappedFields: unknown;
  status: string;
  score: number;
  customerId: string | null;
  assignedTo: string | null;
  nurturedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SocialLeadRecord {
  return { ...row };
}
