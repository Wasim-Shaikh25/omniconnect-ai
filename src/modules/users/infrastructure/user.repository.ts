import { prisma } from "@/shared/database";
import type { Role } from "@/modules/auth";
import { PaginationInput, paginatedResult, toSkip } from "@/shared/kernel";
import {
  ExportRequestRecord,
  UserProfile,
  UserProfileRepository,
} from "../application/ports";

type PrismaUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  isSuperAdmin: boolean;
  organizationId: string | null;
  storeId: string | null;
  deletedAt: Date | null;
};

const notDeleted = { deletedAt: null } as const;

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
    const user = await prisma.user.findUnique({ where: { id, ...notDeleted } });
    return user ? toProfile(user) : null;
  }

  async updateProfile(
    id: string,
    data: { name?: string | null; image?: string | null },
  ): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id, ...notDeleted },
      data: { name: data.name, image: data.image },
    });
    return toProfile(user);
  }

  async setOrganization(id: string, organizationId: string): Promise<void> {
    await prisma.user.update({
      where: { id, ...notDeleted },
      data: { organizationId, tokenVersion: { increment: 1 } },
    });
  }

  async setRole(id: string, role: Role): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id, ...notDeleted },
      data: { role, tokenVersion: { increment: 1 } },
    });
    return toProfile(user);
  }

  async setStore(id: string, storeId: string | null): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id, ...notDeleted },
      data: { storeId, tokenVersion: { increment: 1 } },
    });
    return toProfile(user);
  }

  async listByOrganization(
    organizationId: string,
    pagination?: PaginationInput,
  ) {
    const where = { organizationId, ...notDeleted };
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "asc" },
        ...(pagination
          ? { skip: toSkip(pagination), take: pagination.limit }
          : {}),
      }),
      prisma.user.count({ where }),
    ]);
    return paginatedResult(
      users.map(toProfile),
      total,
      pagination ?? { page: 1, limit: total || 1 },
    );
  }

  async listAll(pagination?: PaginationInput) {
    const where = notDeleted;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(pagination
          ? { skip: toSkip(pagination), take: pagination.limit }
          : {}),
      }),
      prisma.user.count({ where }),
    ]);
    return paginatedResult(
      users.map(toProfile),
      total,
      pagination ?? { page: 1, limit: total || 1 },
    );
  }

  async setSuperAdmin(id: string, isSuperAdmin: boolean): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id, ...notDeleted },
      data: { isSuperAdmin, tokenVersion: { increment: 1 } },
    });
    return toProfile(user);
  }

  async removeFromOrganization(id: string): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id, ...notDeleted },
      data: { organizationId: null, storeId: null, tokenVersion: { increment: 1 } },
    });
    return toProfile(user);
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return prisma.user.count({ where: { organizationId, ...notDeleted } });
  }

  async requestDataExport(
    userId: string,
    organizationId?: string | null,
  ): Promise<ExportRequestRecord> {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const record = await prisma.exportRequest.create({
      data: {
        userId,
        organizationId: organizationId ?? null,
        status: "PENDING",
        expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
      },
    });
    return toExportRecord(record);
  }

  async listExportRequests(userId: string): Promise<ExportRequestRecord[]> {
    const records = await prisma.exportRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toExportRecord);
  }

  async getExportRequest(
    id: string,
    userId: string,
  ): Promise<ExportRequestRecord | null> {
    const record = await prisma.exportRequest.findFirst({
      where: { id, userId },
    });
    return record ? toExportRecord(record) : null;
  }

  async markExportCompleted(
    id: string,
    downloadUrl: string,
  ): Promise<ExportRequestRecord | null> {
    const record = await prisma.exportRequest.update({
      where: { id },
      data: { status: "COMPLETED", downloadUrl, completedAt: new Date() },
    });
    return toExportRecord(record);
  }

  async deleteAccount(
    userId: string,
    reason?: string | null,
  ): Promise<UserProfile | null> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        deletedReason: reason ?? null,
        tokenVersion: { increment: 1 },
      },
    });
    return toProfile(user);
  }

  async hardDeleteExpired(before: Date): Promise<number> {
    const result = await prisma.user.deleteMany({
      where: { deletedAt: { lt: before } },
    });
    return result.count;
  }
}

function toExportRecord(record: {
  id: string;
  userId: string;
  organizationId: string | null;
  status: string;
  downloadUrl: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  completedAt: Date | null;
}): ExportRequestRecord {
  return {
    id: record.id,
    userId: record.userId,
    organizationId: record.organizationId,
    status: record.status as ExportRequestRecord["status"],
    downloadUrl: record.downloadUrl,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
  };
}
