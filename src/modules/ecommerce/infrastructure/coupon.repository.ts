import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import { CouponStatus } from "@prisma/client";
import type { CouponRecord, CouponRepository } from "../application/ports";

type PrismaCoupon = {
  id: string;
  code: string;
  storeId: string;
  discountPct: number;
  status: string;
  expiresAt: Date | null;
  deletedAt: Date | null;
  usageCount: number;
  revenueAttributed: Prisma.Decimal | null;
  lastUsedAt: Date | null;
};

function toRecord(c: PrismaCoupon): CouponRecord {
  return {
    id: c.id,
    code: c.code,
    storeId: c.storeId,
    discountPct: c.discountPct,
    status: c.status,
    expiresAt: c.expiresAt,
    deletedAt: c.deletedAt,
    usageCount: c.usageCount,
    revenueAttributed: c.revenueAttributed ? c.revenueAttributed.toNumber() : null,
    lastUsedAt: c.lastUsedAt,
  };
}

function notDeleted() {
  return { deletedAt: null };
}

export class PrismaCouponRepository implements CouponRepository {
  async create(input: {
    storeId: string;
    code: string;
    discountPct: number;
    expiresAt: Date | null;
    customerId: string | null;
  }): Promise<CouponRecord> {
    const coupon = await prisma.coupon.create({
      data: {
        storeId: input.storeId,
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

  async disable(storeId: string, code: string): Promise<void> {
    await prisma.coupon.updateMany({
      where: { storeId, code, ...notDeleted() },
      data: { status: "DISABLED" },
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
    storeId: string,
    options: { limit?: number; offset?: number; search?: string; includeDeleted?: boolean } = {},
  ): Promise<CouponRecord[]> {
    const rows = await prisma.coupon.findMany({
      where: {
        storeId,
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

  async countByStore(storeId: string, search?: string): Promise<number> {
    return prisma.coupon.count({
      where: {
        storeId,
        ...notDeleted(),
        ...(search ? { code: { contains: search, mode: "insensitive" } } : {}),
      },
    });
  }
}
