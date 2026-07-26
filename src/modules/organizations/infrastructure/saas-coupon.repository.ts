import { prisma } from "@/shared/database";
import type { SaaSCouponRecord, SaaSCouponRepository } from "../application/saas-coupon";

export class PrismaSaaSCouponRepository implements SaaSCouponRepository {
  async create(input: {
    code: string;
    label?: string;
    discountPct: number;
    maxUses?: number | null;
    expiresAt?: Date | null;
    appliesTo: string[];
    stripeCouponId?: string | null;
    stripePromotionCodeId?: string | null;
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
        stripeCouponId: input.stripeCouponId ?? null,
        stripePromotionCodeId: input.stripePromotionCodeId ?? null,
        createdBy: input.createdBy,
      },
    });
    return this.map(coupon);
  }

  async findByCode(code: string): Promise<SaaSCouponRecord | null> {
    const coupon = await prisma.saaSCoupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });
    return coupon ? this.map(coupon) : null;
  }

  async findById(id: string): Promise<SaaSCouponRecord | null> {
    const coupon = await prisma.saaSCoupon.findUnique({ where: { id } });
    return coupon ? this.map(coupon) : null;
  }

  async list(): Promise<SaaSCouponRecord[]> {
    const coupons = await prisma.saaSCoupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    return coupons.map((c) => this.map(c));
  }

  async incrementUsage(id: string): Promise<void> {
    await prisma.saaSCoupon.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
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
    stripeCouponId: string | null;
    stripePromotionCodeId: string | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): SaaSCouponRecord {
    return { ...c };
  }
}
