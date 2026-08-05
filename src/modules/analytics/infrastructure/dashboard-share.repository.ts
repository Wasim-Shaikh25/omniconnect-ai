import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import type { DashboardSchema } from "@/modules/ai";
import type {
  CreateDashboardShareInput,
  DashboardShareRecord,
  DashboardShareRepository,
} from "../application/ports";

export class PrismaDashboardShareRepository implements DashboardShareRepository {
  async create(input: CreateDashboardShareInput): Promise<DashboardShareRecord> {
    const row = await prisma.dashboardShare.create({
      data: {
        projectId: input.projectId,
        token: input.token,
        title: input.title ?? null,
        schema: input.schema as unknown as Prisma.InputJsonValue,
        expiresAt: input.expiresAt ?? null,
      },
    });
    return mapRow(row);
  }

  async findByToken(token: string): Promise<DashboardShareRecord | null> {
    const row = await prisma.dashboardShare.findUnique({
      where: { token },
    });
    return row ? mapRow(row) : null;
  }
}

function mapRow(row: {
  id: string;
  projectId: string;
  token: string;
  title: string | null;
  schema: Prisma.JsonValue;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): DashboardShareRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    token: row.token,
    title: row.title,
    schema: row.schema as unknown as DashboardSchema,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
