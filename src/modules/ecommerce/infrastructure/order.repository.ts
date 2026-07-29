import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import { AttributionSource } from "@prisma/client";
import type { OrderRecord, OrderRepository } from "../application/ports";
import type { ConnectorOrder } from "../domain/connector";

type PrismaOrder = {
  id: string;
  externalId: string;
  storeId: string;
  total: Prisma.Decimal | null;
  currency: string | null;
  orderDate: Date;
  couponCode: string | null;
  customerRef: string | null;
  customerEmail: string | null;
  attributedMediaId: string | null;
  attributionSource: AttributionSource | null;
  isFirstTimeCustomer: boolean;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaOrderRepository implements OrderRepository {
  async sync(storeId: string, orders: ConnectorOrder[]): Promise<{ upserted: number; removed: number }> {
    const providedExternalIds = new Set(orders.map((o) => o.externalId));
    const now = new Date();

    const existing = await prisma.order.findMany({
      where: { storeId },
      select: { id: true, externalId: true },
    });

    const externalToId = new Map(existing.map((e) => [e.externalId, e.id]));

    let upserted = 0;
    for (const order of orders) {
      const existingId = externalToId.get(order.externalId);
      const isFirst = await this.isFirstTimeCustomer(
        storeId,
        order.customerEmail ?? null,
        order.customerRef ?? null,
        order.createdAt,
      );
      const data = {
        externalId: order.externalId,
        storeId,
        total: order.total,
        currency: order.currency,
        orderDate: order.createdAt,
        couponCode: order.couponCode ?? null,
        customerRef: order.customerRef,
        customerEmail: order.customerEmail,
        isFirstTimeCustomer: isFirst,
        syncedAt: now,
      };

      if (existingId) {
        await prisma.order.update({ where: { id: existingId }, data });
      } else {
        await prisma.order.create({ data });
      }
      upserted++;
    }

    const removed = await prisma.order.deleteMany({
      where: { storeId, externalId: { notIn: Array.from(providedExternalIds) } },
    });

    return { upserted, removed: removed.count };
  }

  async upsertMany(storeId: string, orders: ConnectorOrder[]): Promise<number> {
    const now = new Date();
    const existing = await prisma.order.findMany({
      where: { storeId },
      select: { id: true, externalId: true },
    });
    const externalToId = new Map(existing.map((e) => [e.externalId, e.id]));

    let upserted = 0;
    for (const order of orders) {
      const existingId = externalToId.get(order.externalId);
      const isFirst = await this.isFirstTimeCustomer(
        storeId,
        order.customerEmail ?? null,
        order.customerRef ?? null,
        order.createdAt,
      );
      const data = {
        externalId: order.externalId,
        storeId,
        total: order.total,
        currency: order.currency,
        orderDate: order.createdAt,
        couponCode: order.couponCode ?? null,
        customerRef: order.customerRef,
        customerEmail: order.customerEmail,
        isFirstTimeCustomer: isFirst,
        syncedAt: now,
      };

      if (existingId) {
        await prisma.order.update({ where: { id: existingId }, data });
      } else {
        await prisma.order.create({ data });
      }
      upserted++;
    }
    return upserted;
  }

  private async isFirstTimeCustomer(
    storeId: string,
    email: string | null,
    ref: string | null,
    before: Date,
  ): Promise<boolean> {
    if (!email && !ref) return false;
    const orConditions: Array<{ customerEmail?: string; customerRef?: string }> = [];
    if (email) orConditions.push({ customerEmail: email });
    if (ref) orConditions.push({ customerRef: ref });

    const count = await prisma.order.count({
      where: {
        storeId,
        orderDate: { lt: before },
        OR: orConditions,
      },
    });
    return count === 0;
  }

  async listByStore(
    storeId: string,
    options: {
      limit?: number;
      offset?: number;
      since?: Date;
      couponCode?: string;
      attributedMediaId?: string;
      includeFirstTimeOnly?: boolean;
    } = {},
  ): Promise<OrderRecord[]> {
    const rows = await prisma.order.findMany({
      where: {
        storeId,
        ...(options.since ? { orderDate: { gte: options.since } } : {}),
        ...(options.couponCode ? { couponCode: options.couponCode } : {}),
        ...(options.attributedMediaId ? { attributedMediaId: options.attributedMediaId } : {}),
        ...(options.includeFirstTimeOnly ? { isFirstTimeCustomer: true } : {}),
      },
      orderBy: { orderDate: "desc" },
      take: options.limit,
      skip: options.offset,
    });
    return rows.map((o) => this.toRecord(o as PrismaOrder));
  }

  async countByStore(storeId: string): Promise<number> {
    return prisma.order.count({ where: { storeId } });
  }

  async findByExternalId(storeId: string, externalId: string): Promise<OrderRecord | null> {
    const row = await prisma.order.findFirst({ where: { storeId, externalId } });
    return row ? this.toRecord(row as PrismaOrder) : null;
  }

  async updateAttribution(id: string, attributedMediaId: string, source: string): Promise<void> {
    await prisma.order.update({
      where: { id },
      data: {
        attributedMediaId,
        attributionSource: source as AttributionSource,
      },
    });
  }

  private toRecord(o: PrismaOrder): OrderRecord {
    return {
      id: o.id,
      externalId: o.externalId,
      storeId: o.storeId,
      total: o.total ? o.total.toNumber() : null,
      currency: o.currency,
      orderDate: o.orderDate,
      couponCode: o.couponCode,
      customerRef: o.customerRef,
      customerEmail: o.customerEmail,
      attributedMediaId: o.attributedMediaId,
      attributionSource: o.attributionSource,
      isFirstTimeCustomer: o.isFirstTimeCustomer,
      syncedAt: o.syncedAt,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }
}
