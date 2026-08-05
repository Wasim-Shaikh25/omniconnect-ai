import { prisma } from "@/shared/database";
import type { Prisma } from "@prisma/client";
import type {
  TrackedAccountRecord,
  TrackedAccountRepository,
  CreateTrackedAccountInput,
  UpdateTrackedAccountInput,
} from "../application/ports";

function mapRow(row: {
  id: string;
  projectId: string;
  platform: string;
  handle: string;
  niche: string | null;
  note: string | null;
  lastMedia: unknown;
  lastAnalysis: unknown;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): TrackedAccountRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    platform: row.platform,
    handle: row.handle,
    niche: row.niche,
    note: row.note,
    lastMedia: row.lastMedia as TrackedAccountRecord["lastMedia"],
    lastAnalysis: row.lastAnalysis as TrackedAccountRecord["lastAnalysis"],
    lastSyncedAt: row.lastSyncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaTrackedAccountRepository implements TrackedAccountRepository {
  async create(input: CreateTrackedAccountInput): Promise<TrackedAccountRecord> {
    const row = await prisma.trackedAccount.create({
      data: {
        projectId: input.projectId,
        platform: input.platform ?? "INSTAGRAM",
        handle: input.handle,
        niche: input.niche ?? null,
        note: input.note ?? null,
      },
    });
    return mapRow(row);
  }

  async listByStore(projectId: string, limit = 1000): Promise<TrackedAccountRecord[]> {
    const rows = await prisma.trackedAccount.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapRow);
  }

  async countByStore(projectId: string): Promise<number> {
    return prisma.trackedAccount.count({ where: { projectId } });
  }

  async findById(id: string): Promise<TrackedAccountRecord | null> {
    const row = await prisma.trackedAccount.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  }

  async update(id: string, input: UpdateTrackedAccountInput): Promise<TrackedAccountRecord> {
    const row = await prisma.trackedAccount.update({
      where: { id },
      data: {
        ...(input.niche !== undefined && { niche: input.niche }),
        ...(input.note !== undefined && { note: input.note }),
        ...(input.lastMedia !== undefined && { lastMedia: input.lastMedia as unknown as Prisma.InputJsonValue }),
        ...(input.lastAnalysis !== undefined && { lastAnalysis: input.lastAnalysis as unknown as Prisma.InputJsonValue }),
        ...(input.lastSyncedAt !== undefined && { lastSyncedAt: input.lastSyncedAt }),
      },
    });
    return mapRow(row);
  }

  async delete(id: string, projectId: string): Promise<void> {
    await prisma.trackedAccount.delete({ where: { id, projectId } });
  }
}
