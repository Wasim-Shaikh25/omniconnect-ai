import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import type { PaginationInput } from "@/shared/kernel";
import { paginatedResult, toSkip } from "@/shared/kernel";
import type { SaaSCouponRecord, SaaSCouponRepository } from "../application/saas-coupon";

export class PrismaSaaSCouponRepository implements SaaSCouponRepository {
  async create(input: {
    code: string;
    label?: string;
    discountPct: number;
    maxUses?: number | null;
    expiresAt?: Date | null;
    appliesTo: string[];
    createdBy: string;
  }): Promise<SaaSCouponRecord> {
    const coupon = await prisma.saaSCoupon.create({
      data: {
        code: input.code,
        label: input.label,
        discountPct: input.discountPct,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt,
        appliesTo: input.appliesTo,
        createdBy: input.createdBy,
      },
    });
    return this.map(coupon);
  }

  async findByCode(code: string, tx?: Prisma.TransactionClient): Promise<SaaSCouponRecord | null> {
    const client = tx ?? prisma;
    const coupon = await client.saaSCoupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });
    return coupon ? this.map(coupon) : null;
  }

  async findById(id: string): Promise<SaaSCouponRecord | null> {
    const coupon = await prisma.saaSCoupon.findUnique({ where: { id } });
    return coupon ? this.map(coupon) : null;
  }

  async list(pagination?: PaginationInput) {
    const effectivePagination = pagination ?? { page: 1, limit: 100 };
    const [coupons, total] = await Promise.all([
      prisma.saaSCoupon.findMany({
        orderBy: { createdAt: "desc" },
        skip: toSkip(effectivePagination),
        take: effectivePagination.limit,
      }),
      prisma.saaSCoupon.count(),
    ]);
    return paginatedResult(
      coupons.map((c) => this.map(c)),
      total,
      effectivePagination,
    );
  }

  async incrementUsage(id: string, maxUses: number | null, tx?: Prisma.TransactionClient): Promise<boolean> {
    const client = tx ?? prisma;
    const where =
      maxUses !== null
        ? { id, usedCount: { lt: maxUses } }
        : { id };
    const { count } = await client.saaSCoupon.updateMany({
      where,
      data: { usedCount: { increment: 1 } },
    });
    return count > 0;
  }

  private map(c: {
    id: string;
    code: string;
    label: string | null;
    discountPct: number;
    maxUses: number | null;
    usedCount: number;
    expiresAt: Date | null;
    appliesTo: string[];
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): SaaSCouponRecord {
    return { ...c };
  }
}
