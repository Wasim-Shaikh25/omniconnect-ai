import { prisma } from "@/shared/database";
import type { CouponRecord, CouponRepository } from "../application/ports";

type PrismaCoupon = {
  id: string;
  code: string;
  discountPct: number;
  status: string;
  expiresAt: Date | null;
};

function toRecord(c: PrismaCoupon): CouponRecord {
  return {
    id: c.id,
    code: c.code,
    discountPct: c.discountPct,
    status: c.status,
    expiresAt: c.expiresAt,
  };
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

  async disable(storeId: string, code: string): Promise<void> {
    await prisma.coupon.updateMany({
      where: { storeId, code },
      data: { status: "DISABLED" },
    });
  }

  async listByStore(storeId: string, limit = 50): Promise<CouponRecord[]> {
    const rows = await prisma.coupon.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }
}
