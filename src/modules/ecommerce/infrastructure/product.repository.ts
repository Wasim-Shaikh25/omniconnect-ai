import { prisma } from "@/shared/database";
import type { ConnectorProduct } from "../domain/connector";
import type { ProductRecord, ProductRepository } from "../application/ports";

type PrismaProduct = {
  id: string;
  externalId: string;
  projectId: string;
  title: string;
  description: string | null;
  price: { toString(): string } | null;
  currency: string | null;
  inventory: number | null;
  imageUrl: string | null;
  deletedAt: Date | null;
};

function toRecord(p: PrismaProduct): ProductRecord {
  return {
    id: p.id,
    externalId: p.externalId,
    projectId: p.projectId,
    title: p.title,
    description: p.description,
    price: p.price !== null ? Number(p.price.toString()) : null,
    currency: p.currency,
    inventory: p.inventory,
    imageUrl: p.imageUrl,
    deletedAt: p.deletedAt,
  };
}

function notDeleted() {
  return { deletedAt: null };
}

export class PrismaProductRepository implements ProductRepository {
  async upsertMany(
    projectId: string,
    products: ConnectorProduct[],
  ): Promise<number> {
    await prisma.$transaction(
      products.map((p) =>
        prisma.product.upsert({
          where: {
            storeId_externalId: { projectId, externalId: p.externalId },
          },
          create: {
            projectId,
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
            deletedAt: null,
          },
        }),
      ),
    );
    return products.length;
  }

  async sync(
    projectId: string,
    products: ConnectorProduct[],
  ): Promise<{ upserted: number; removed: number }> {
    if (products.length === 0) {
      return { upserted: 0, removed: 0 };
    }

    const externalIds = products.map((p) => p.externalId);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const upsertOps = products.map((p) =>
        tx.product.upsert({
          where: {
            storeId_externalId: { projectId, externalId: p.externalId },
          },
          create: {
            projectId,
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
            deletedAt: null,
          },
        }),
      );
      await Promise.all(upsertOps);
      const removed = await tx.product.updateMany({
        where: {
          projectId,
          externalId: { notIn: externalIds },
          deletedAt: null,
        },
        data: { deletedAt: now },
      });
      return removed.count;
    });

    return { upserted: products.length, removed: result };
  }

  async update(
    id: string,
    input: {
      title?: string;
      description?: string | null;
      price?: number | null;
      currency?: string | null;
      inventory?: number | null;
      imageUrl?: string | null;
    },
  ): Promise<ProductRecord | null> {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.inventory !== undefined ? { inventory: input.inventory } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      },
    });
    return product ? toRecord(product) : null;
  }

  async findById(id: string): Promise<ProductRecord | null> {
    const product = await prisma.product.findFirst({
      where: { id, ...notDeleted() },
    });
    return product ? toRecord(product) : null;
  }

  async findByExternalId(projectId: string, externalId: string): Promise<ProductRecord | null> {
    const product = await prisma.product.findFirst({
      where: { projectId, externalId, ...notDeleted() },
    });
    return product ? toRecord(product) : null;
  }

  async listByStore(
    projectId: string,
    options: { limit?: number; offset?: number; search?: string; includeDeleted?: boolean } = {},
  ): Promise<ProductRecord[]> {
    const rows = await prisma.product.findMany({
      where: {
        projectId,
        ...(options.includeDeleted ? {} : notDeleted()),
        ...(options.search
          ? { title: { contains: options.search, mode: "insensitive" } }
          : {}),
      },
      orderBy: { title: "asc" },
      skip: options.offset ?? 0,
      take: options.limit ?? 50,
    });
    return rows.map(toRecord);
  }

  async countByStore(projectId: string, search?: string): Promise<number> {
    return prisma.product.count({
      where: {
        projectId,
        ...notDeleted(),
        ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      },
    });
  }

  async delete(id: string): Promise<ProductRecord | null> {
    const product = await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return product ? toRecord(product) : null;
  }

  async markDeletedNotInBatch(
    projectId: string,
    externalIds: string[],
    deletedAt: Date,
  ): Promise<number> {
    const result = await prisma.product.updateMany({
      where: {
        projectId,
        externalId: { notIn: externalIds },
        deletedAt: null,
      },
      data: { deletedAt },
    });
    return result.count;
  }
}
