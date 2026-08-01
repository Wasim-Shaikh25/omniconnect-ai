import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/shared/database";
import type { CartRecord, CartRepository } from "../application/ports";

type PrismaCart = {
  id: string;
  storeId: string;
  cartToken: string;
  email: string | null;
  lineItemTitles: string[];
  totalPrice: Decimal | null;
  currency: string | null;
  recoveredUrl: string | null;
  lastActivityAt: Date;
  notifiedAt: Date | null;
  convertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(c: PrismaCart): CartRecord {
  return {
    id: c.id,
    storeId: c.storeId,
    cartToken: c.cartToken,
    email: c.email,
    lineItemTitles: c.lineItemTitles,
    totalPrice: c.totalPrice ? Number(c.totalPrice) : null,
    currency: c.currency,
    recoveredUrl: c.recoveredUrl,
    lastActivityAt: c.lastActivityAt,
    notifiedAt: c.notifiedAt,
    convertedAt: c.convertedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export class PrismaCartRepository implements CartRepository {
  async upsert(input: {
    storeId: string;
    cartToken: string;
    email?: string | null;
    lineItemTitles?: string[];
    totalPrice?: number | null;
    currency?: string | null;
    recoveredUrl?: string | null;
    lastActivityAt: Date;
  }): Promise<CartRecord> {
    const result = await prisma.cart.upsert({
      where: { storeId_cartToken: { storeId: input.storeId, cartToken: input.cartToken } },
      create: {
        storeId: input.storeId,
        cartToken: input.cartToken,
        email: input.email ?? null,
        lineItemTitles: input.lineItemTitles ?? [],
        totalPrice: input.totalPrice,
        currency: input.currency ?? null,
        recoveredUrl: input.recoveredUrl ?? null,
        lastActivityAt: input.lastActivityAt,
      },
      update: {
        email: input.email ?? null,
        lineItemTitles: input.lineItemTitles ?? [],
        totalPrice: input.totalPrice,
        currency: input.currency ?? null,
        recoveredUrl: input.recoveredUrl ?? null,
        lastActivityAt: input.lastActivityAt,
      },
    });
    return toRecord(result);
  }

  async findByStoreAndToken(
    storeId: string,
    cartToken: string,
  ): Promise<CartRecord | null> {
    const row = await prisma.cart.findUnique({
      where: { storeId_cartToken: { storeId, cartToken } },
    });
    return row ? toRecord(row) : null;
  }

  async markConverted(storeId: string, cartToken: string): Promise<void> {
    await prisma.cart.updateMany({
      where: { storeId, cartToken, convertedAt: null },
      data: { convertedAt: new Date() },
    });
  }

  async markNotified(id: string): Promise<void> {
    await prisma.cart.update({
      where: { id },
      data: { notifiedAt: new Date() },
    });
  }

  async findAbandoned(
    thresholdMinutes: number,
    limit = 500,
  ): Promise<CartRecord[]> {
    const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    const rows = await prisma.cart.findMany({
      where: {
        lastActivityAt: { lt: cutoff },
        notifiedAt: null,
        convertedAt: null,
      },
      orderBy: { lastActivityAt: "asc" },
      take: limit,
    });
    return rows.map(toRecord);
  }
}
