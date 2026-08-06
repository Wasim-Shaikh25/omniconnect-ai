import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import { CouponStatus } from "@prisma/client";
import type { CouponRecord, CouponRepository } from "../application/ports";

type PrismaCoupon = {
  id: string;
  code: string;
  projectId: string;
  discountPct: number;
  status: string;
  expiresAt: Date | null;
  deletedAt: Date | null;
  usageCount: number;
  revenueAttributed: Prisma.Decimal | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(c: PrismaCoupon): CouponRecord {
  return {
    id: c.id,
    code: c.code,
    projectId: c.projectId,
    discountPct: c.discountPct,
    status: c.status,
    expiresAt: c.expiresAt,
    deletedAt: c.deletedAt,
    usageCount: c.usageCount,
    revenueAttributed: c.revenueAttributed ? c.revenueAttributed.toNumber() : null,
    lastUsedAt: c.lastUsedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function notDeleted() {
  return { deletedAt: null };
}

export class PrismaCouponRepository implements CouponRepository {
  async create(input: {
    projectId: string;
    code: string;
    discountPct: number;
    expiresAt: Date | null;
    customerId: string | null;
  }): Promise<CouponRecord> {
    const coupon = await prisma.coupon.create({
      data: {
        projectId: input.projectId,
        code: input.code,
        discountPct: input.discountPct,
        expiresAt: input.expiresAt,
        customerId: input.customerId,
      },
    });
    return toRecord(coupon);
  }

  async findById(id: string): Promise<CouponRecord | null> {
    const coupon = await prisma.coupon.findFirst({
      where: { id, ...notDeleted() },
    });
    return coupon ? toRecord(coupon) : null;
  }

  async update(
    id: string,
    input: {
      discountPct?: number;
      status?: string;
      expiresAt?: Date | null;
      usageCount?: number;
      revenueAttributed?: number | null;
      lastUsedAt?: Date | null;
    },
  ): Promise<CouponRecord | null> {
    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(input.discountPct !== undefined
          ? { discountPct: input.discountPct }
          : {}),
        ...(input.status !== undefined
          ? { status: input.status as CouponStatus }
          : {}),
        ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
        ...(input.usageCount !== undefined ? { usageCount: input.usageCount } : {}),
        ...(input.revenueAttributed !== undefined ? { revenueAttributed: input.revenueAttributed } : {}),
        ...(input.lastUsedAt !== undefined ? { lastUsedAt: input.lastUsedAt } : {}),
      },
    });
    return coupon ? toRecord(coupon) : null;
  }

  async disable(projectId: string, code: string): Promise<void> {
    await prisma.coupon.updateMany({
      where: { projectId, code, ...notDeleted() },
      data: { status: "DISABLED" },
    });
  }

  async findByCode(projectId: string, code: string): Promise<CouponRecord | null> {
    const coupon = await prisma.coupon.findFirst({
      where: { projectId, code, ...notDeleted() },
    });
    return coupon ? toRecord(coupon) : null;
  }

  async incrementRedemption(
    projectId: string,
    code: string,
    revenue: number,
  ): Promise<CouponRecord | null> {
    const current = await this.findByCode(projectId, code);
    if (!current) return null;
    return this.update(current.id, {
      usageCount: current.usageCount + 1,
      revenueAttributed: (current.revenueAttributed ?? 0) + revenue,
      lastUsedAt: new Date(),
    });
  }

  async delete(id: string): Promise<CouponRecord | null> {
    const coupon = await prisma.coupon.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DISABLED" },
    });
    return coupon ? toRecord(coupon) : null;
  }

  async listByStore(
    projectId: string,
    options: { limit?: number; offset?: number; search?: string; includeDeleted?: boolean } = {},
  ): Promise<CouponRecord[]> {
    const rows = await prisma.coupon.findMany({
      where: {
        projectId,
        ...(options.includeDeleted ? {} : notDeleted()),
        ...(options.search
          ? { code: { contains: options.search, mode: "insensitive" } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      skip: options.offset ?? 0,
      take: options.limit ?? 50,
    });
    return rows.map(toRecord);
  }

  async countByStore(projectId: string, search?: string): Promise<number> {
    return prisma.coupon.count({
      where: {
        projectId,
        ...notDeleted(),
        ...(search ? { code: { contains: search, mode: "insensitive" } } : {}),
      },
    });
  }
}
