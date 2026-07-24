import { prisma } from "@/shared/database";
import type { ConnectorProduct } from "../domain/connector";
import type { ProductRecord, ProductRepository } from "../application/ports";

type PrismaProduct = {
  id: string;
  externalId: string;
  title: string;
  price: { toString(): string } | null;
  currency: string | null;
  inventory: number | null;
  imageUrl: string | null;
};

function toRecord(p: PrismaProduct): ProductRecord {
  return {
    id: p.id,
    externalId: p.externalId,
    title: p.title,
    price: p.price !== null ? Number(p.price.toString()) : null,
    currency: p.currency,
    inventory: p.inventory,
    imageUrl: p.imageUrl,
  };
}

export class PrismaProductRepository implements ProductRepository {
  async upsertMany(
    storeId: string,
    products: ConnectorProduct[],
  ): Promise<number> {
    await prisma.$transaction(
      products.map((p) =>
        prisma.product.upsert({
          where: {
            storeId_externalId: { storeId, externalId: p.externalId },
          },
          create: {
            storeId,
            externalId: p.externalId,
            title: p.title,
            description: p.description,
            price: p.price ?? undefined,
            currency: p.currency,
            inventory: p.inventory,
            imageUrl: p.imageUrl,
          },
          update: {
            title: p.title,
            description: p.description,
            price: p.price ?? undefined,
            currency: p.currency,
            inventory: p.inventory,
            imageUrl: p.imageUrl,
          },
        }),
      ),
    );
    return products.length;
  }

  async listByStore(storeId: string, limit = 50): Promise<ProductRecord[]> {
    const rows = await prisma.product.findMany({
      where: { storeId },
      orderBy: { title: "asc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async countByStore(storeId: string): Promise<number> {
    return prisma.product.count({ where: { storeId } });
  }
}
