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
  projectId: string;
  igUserId: string | null;
  fbUserId: string | null;
  username: string | null;
  interests: string[];
  tags: string[];
  lifecycleStage: string;
  consent: string;
  consentUpdatedAt: Date | null;
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toLifecycleStage(value: string): CustomerRecord["lifecycleStage"] {
  if (value === "PROSPECT" || value === "CUSTOMER" || value === "CHURNED") {
    return value;
  }
  return "LEAD";
}

function toConsent(value: string): CustomerRecord["consent"] {
  if (value === "GRANTED" || value === "DECLINED") {
    return value;
  }
  return "PENDING";
}

function toRecord(c: PrismaCustomer): CustomerRecord {
  return {
    id: c.id,
    projectId: c.projectId,
    igUserId: c.igUserId,
    fbUserId: c.fbUserId,
    username: c.username,
    interests: c.interests ?? [],
    tags: c.tags ?? [],
    lifecycleStage: toLifecycleStage(c.lifecycleStage),
    consent: toConsent(c.consent),
    consentUpdatedAt: c.consentUpdatedAt,
    lastActivityAt: c.lastActivityAt,
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

async function emitProfileUpdated(record: CustomerRecord): Promise<void> {
  await eventBus.publish(
    new CustomerProfileUpdated(record.id, {
      projectId: record.projectId,
      customerId: record.id,
      tags: record.tags,
      interests: record.interests,
    }),
  );
}

export class PrismaCustomerRepository implements CustomerRepository {
  async upsertByExternalId(input: {
    projectId: string;
    channel: "INSTAGRAM" | "FACEBOOK";
    externalUserId: string;
    username: string | null;
  }): Promise<CustomerRecord> {
    const idField = input.channel === "INSTAGRAM" ? "igUserId" : "fbUserId";

    const existing = await prisma.customer.findFirst({
      where: { projectId: input.projectId, [idField]: input.externalUserId },
    });

    if (existing) {
      const updated =
        input.username && input.username !== existing.username
          ? await prisma.customer.update({
              where: { id: existing.id, projectId: input.projectId },
              data: { username: input.username },
            })
          : existing;
      return toRecord(updated);
    }

    const created = await prisma.customer.create({
      data: {
        projectId: input.projectId,
        username: input.username,
        [idField]: input.externalUserId,
      },
    });
    return toRecord(created);
  }

  async listByStore(projectId: string, limit = 50): Promise<CustomerRecord[]> {
    const rows = await prisma.customer.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async listByStoreIds(
    storeIds: string[],
    limit = 250,
  ): Promise<CustomerRecord[]> {
    const rows = await prisma.customer.findMany({
      where: { projectId: { in: storeIds } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async findById(id: string, projectId?: string): Promise<CustomerRecord | null> {
    const found = await prisma.customer.findUnique({
      where: projectId ? { id, projectId } : { id },
    });
    return found ? toRecord(found) : null;
  }

  async getActivity(
    customerId: string,
    projectId?: string,
  ): Promise<{
    conversationCount: number;
    messageCount: number;
    followerCount: number;
    couponUsageCount: number;
    lastMessageAt: Date | null;
  }> {
    const storeFilter = projectId ? { projectId } : {};
    const [
      conversationCount,
      messageCount,
      followerCount,
      couponUsageCount,
      lastMessage,
    ] = await Promise.all([
      prisma.conversation.count({ where: { customerId, ...storeFilter } }),
      prisma.message.count({
        where: { conversation: { customerId, ...storeFilter } },
      }),
      prisma.follower.count({ where: { customerId, ...storeFilter } }),
      prisma.couponUsage.count({
        where: { customerId, customer: { ...storeFilter } },
      }),
      prisma.message.findFirst({
        where: { conversation: { customerId, ...storeFilter } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    return {
      conversationCount,
      messageCount,
      followerCount,
      couponUsageCount,
      lastMessageAt: lastMessage?.createdAt ?? null,
    };
  }

  async getProfile(input: {
    projectId: string;
    channel: "INSTAGRAM" | "FACEBOOK";
    externalUserId: string;
  }): Promise<CustomerProfile | null> {
    const idField = input.channel === "INSTAGRAM" ? "igUserId" : "fbUserId";
    const row = await prisma.customer.findFirst({
      where: { projectId: input.projectId, [idField]: input.externalUserId },
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
    projectId: string;
    tags?: string[];
    interests?: string[];
  }): Promise<CustomerRecord> {
    const existing = await prisma.customer.findUnique({
      where: { id: input.customerId, projectId: input.projectId },
    });
    if (!existing) throw new Error("Customer not found");

    const updated = await prisma.customer.update({
      where: { id: input.customerId, projectId: input.projectId },
      data: {
        tags: unique([...(existing.tags ?? []), ...(input.tags ?? [])]),
        interests: unique([
          ...(existing.interests ?? []),
          ...(input.interests ?? []),
        ]),
      },
    });

    const record = toRecord(updated);
    await emitProfileUpdated(record);
    return record;
  }

  async updateLifecycleStage(
    customerId: string,
    projectId: string,
    stage: CustomerRecord["lifecycleStage"],
  ): Promise<CustomerRecord> {
    const updated = await prisma.customer.update({
      where: { id: customerId, projectId },
      data: { lifecycleStage: stage },
    });
    return toRecord(updated);
  }

  async updateConsent(
    customerId: string,
    projectId: string,
    consent: CustomerRecord["consent"],
  ): Promise<CustomerRecord> {
    const updated = await prisma.customer.update({
      where: { id: customerId, projectId },
      data: { consent, consentUpdatedAt: new Date() },
    });
    return toRecord(updated);
  }

  async recordCouponSent(input: {
    customerId: string;
    projectId: string;
    couponId: string;
  }): Promise<CustomerRecord> {
    const existing = await prisma.customer.findUnique({
      where: { id: input.customerId, projectId: input.projectId },
    });
    if (!existing) throw new Error("Customer not found");

    const updated = await prisma.customer.update({
      where: { id: input.customerId, projectId: input.projectId },
      data: {
        tags: unique([...existing.tags, "coupon-sent"]),
      },
    });

    const record = toRecord(updated);
    await emitProfileUpdated(record);
    return record;
  }

  async recordCouponUsed(input: {
    customerId: string;
    projectId: string;
    couponId: string;
    orderRef?: string;
  }): Promise<CustomerRecord> {
    const existing = await prisma.customer.findUnique({
      where: { id: input.customerId, projectId: input.projectId },
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
      where: { id: input.customerId, projectId: input.projectId },
      data: {
        tags: unique([...existing.tags, "coupon-used"]),
      },
    });

    const record = toRecord(updated);
    await emitProfileUpdated(record);
    return record;
  }
}
