import { prisma } from "@/shared/database";
import { eventBus } from "@/shared/events";
import type {
  CustomerCouponRecord,
  CustomerCouponUsageRecord,
  CustomerProfile,
  CustomerRecord,
  CustomerRepository,
} from "../application/ports";
import { CustomerProfileUpdated } from "../domain/events";

type PrismaCustomer = {
  id: string;
  storeId: string;
  igUserId: string | null;
  fbUserId: string | null;
  username: string | null;
  interests: string[];
  tags: string[];
  createdAt: Date;
};

function toRecord(c: PrismaCustomer): CustomerRecord {
  return {
    id: c.id,
    storeId: c.storeId,
    igUserId: c.igUserId,
    fbUserId: c.fbUserId,
    username: c.username,
    interests: c.interests ?? [],
    tags: c.tags ?? [],
    createdAt: c.createdAt,
  };
}

function toCouponRecord(c: {
  id: string;
  code: string;
  discountPct: number;
  status: string;
  expiresAt: Date | null;
}): CustomerCouponRecord {
  return {
    id: c.id,
    code: c.code,
    discountPct: c.discountPct,
    status: c.status,
    expiresAt: c.expiresAt,
  };
}

function toUsageRecord(u: {
  couponId: string;
  usedAt: Date;
  orderRef: string | null;
}): CustomerCouponUsageRecord {
  return {
    couponId: u.couponId,
    usedAt: u.usedAt,
    orderRef: u.orderRef,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function emitProfileUpdated(record: CustomerRecord): void {
  void eventBus.publish(
    new CustomerProfileUpdated(record.id, {
      storeId: record.storeId,
      customerId: record.id,
      tags: record.tags,
      interests: record.interests,
    }),
  );
}

export class PrismaCustomerRepository implements CustomerRepository {
  async upsertByExternalId(input: {
    storeId: string;
    channel: "INSTAGRAM" | "FACEBOOK";
    externalUserId: string;
    username: string | null;
  }): Promise<CustomerRecord> {
    const idField = input.channel === "INSTAGRAM" ? "igUserId" : "fbUserId";

    const existing = await prisma.customer.findFirst({
      where: { storeId: input.storeId, [idField]: input.externalUserId },
    });

    if (existing) {
      const updated =
        input.username && input.username !== existing.username
          ? await prisma.customer.update({
              where: { id: existing.id },
              data: { username: input.username },
            })
          : existing;
      return toRecord(updated);
    }

    const created = await prisma.customer.create({
      data: {
        storeId: input.storeId,
        username: input.username,
        [idField]: input.externalUserId,
      },
    });
    return toRecord(created);
  }

  async listByStore(storeId: string, limit = 50): Promise<CustomerRecord[]> {
    const rows = await prisma.customer.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async getProfile(input: {
    storeId: string;
    channel: "INSTAGRAM" | "FACEBOOK";
    externalUserId: string;
  }): Promise<CustomerProfile | null> {
    const idField = input.channel === "INSTAGRAM" ? "igUserId" : "fbUserId";
    const row = await prisma.customer.findFirst({
      where: { storeId: input.storeId, [idField]: input.externalUserId },
      include: { coupons: true, couponUsages: true },
    });
    if (!row) return null;

    return {
      customer: toRecord(row),
      coupons: row.coupons.map(toCouponRecord),
      usages: row.couponUsages.map(toUsageRecord),
    };
  }

  async tag(input: {
    customerId: string;
    tags?: string[];
    interests?: string[];
  }): Promise<CustomerRecord> {
    const existing = await prisma.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!existing) throw new Error("Customer not found");

    const updated = await prisma.customer.update({
      where: { id: input.customerId },
      data: {
        tags: unique([...(existing.tags ?? []), ...(input.tags ?? [])]),
        interests: unique([
          ...(existing.interests ?? []),
          ...(input.interests ?? []),
        ]),
      },
    });

    const record = toRecord(updated);
    emitProfileUpdated(record);
    return record;
  }

  async recordCouponSent(input: {
    customerId: string;
    couponId: string;
  }): Promise<CustomerRecord> {
    const existing = await prisma.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!existing) throw new Error("Customer not found");

    const updated = await prisma.customer.update({
      where: { id: input.customerId },
      data: {
        tags: unique([...existing.tags, "coupon-sent"]),
      },
    });

    const record = toRecord(updated);
    emitProfileUpdated(record);
    return record;
  }

  async recordCouponUsed(input: {
    customerId: string;
    couponId: string;
    orderRef?: string;
  }): Promise<CustomerRecord> {
    const existing = await prisma.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!existing) throw new Error("Customer not found");

    await prisma.couponUsage.create({
      data: {
        couponId: input.couponId,
        customerId: input.customerId,
        orderRef: input.orderRef ?? null,
      },
    });

    const updated = await prisma.customer.update({
      where: { id: input.customerId },
      data: {
        tags: unique([...existing.tags, "coupon-used"]),
      },
    });

    const record = toRecord(updated);
    emitProfileUpdated(record);
    return record;
  }
}
