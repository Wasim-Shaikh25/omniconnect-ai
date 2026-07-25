import { prisma } from "@/shared/database";
import type { Prisma } from "@prisma/client";
import { CatalogSyncStatus, ShoppableMediaStatus } from "@prisma/client";
import type {
  CatalogSyncRecord,
  CatalogSyncRepository,
  ProductMappingRecord,
  ProductMappingRepository,
  ShoppableMediaRecord,
  ShoppableMediaRepository,
} from "../application/ports";

export class PrismaCatalogSyncRepository implements CatalogSyncRepository {
  async upsert(
    storeId: string,
    input: {
      externalCatalogId?: string | null;
      status: string;
      errorLog?: string | null;
    },
  ): Promise<CatalogSyncRecord> {
    const existing = await prisma.metaCatalogSync.findFirst({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      const updated = await prisma.metaCatalogSync.update({
        where: { id: existing.id },
        data: {
          externalCatalogId:
            input.externalCatalogId ?? existing.externalCatalogId,
          status: input.status as CatalogSyncStatus,
          errorLog: input.errorLog ?? existing.errorLog,
          lastSyncedAt: new Date(),
        },
      });
      return toSyncRecord(updated);
    }

    const created = await prisma.metaCatalogSync.create({
      data: {
        storeId,
        externalCatalogId: input.externalCatalogId ?? null,
        status: input.status as CatalogSyncStatus,
        errorLog: input.errorLog ?? null,
        lastSyncedAt: new Date(),
      },
    });
    return toSyncRecord(created);
  }

  async findLatest(storeId: string): Promise<CatalogSyncRecord | null> {
    const row = await prisma.metaCatalogSync.findFirst({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    });
    return row ? toSyncRecord(row) : null;
  }
}

export class PrismaProductMappingRepository implements ProductMappingRepository {
  async saveMany(
    storeId: string,
    products: Array<{
      productId: string;
      externalProductId: string | null;
      status: string;
      errorMessage?: string | null;
    }>,
  ): Promise<void> {
    await prisma.$transaction(
      products.map((p) =>
        prisma.metaProductMapping.upsert({
          where: {
            storeId_productId: { storeId, productId: p.productId },
          },
          create: {
            storeId,
            productId: p.productId,
            externalProductId: p.externalProductId,
            status: p.status,
            errorMessage: p.errorMessage ?? null,
            lastPushedAt: new Date(),
          },
          update: {
            externalProductId: p.externalProductId,
            status: p.status,
            errorMessage: p.errorMessage ?? null,
            lastPushedAt: new Date(),
          },
        }),
      ),
    );
  }

  async listByStore(storeId: string): Promise<ProductMappingRecord[]> {
    const rows = await prisma.metaProductMapping.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toMappingRecord);
  }
}

export class PrismaShoppableMediaRepository
  implements ShoppableMediaRepository
{
  async create(input: {
    storeId: string;
    mediaType: string;
    caption?: string;
    productTags: unknown;
    status?: string;
  }): Promise<ShoppableMediaRecord> {
    const created = await prisma.shoppableMedia.create({
      data: {
        storeId: input.storeId,
        mediaType: input.mediaType,
        caption: input.caption,
        productTags: input.productTags as Prisma.InputJsonValue,
        status: (input.status ?? "DRAFT") as ShoppableMediaStatus,
      },
    });
    return toMediaRecord(created);
  }

  async updateExternalId(
    id: string,
    externalMediaId: string,
    status: string,
    permalink?: string,
  ): Promise<ShoppableMediaRecord> {
    const updated = await prisma.shoppableMedia.update({
      where: { id },
      data: {
        externalMediaId,
        status: status as ShoppableMediaStatus,
        permalink,
      },
    });
    return toMediaRecord(updated);
  }

  async listByStore(storeId: string): Promise<ShoppableMediaRecord[]> {
    const rows = await prisma.shoppableMedia.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toMediaRecord);
  }
}

function toSyncRecord(row: {
  id: string;
  storeId: string;
  externalCatalogId: string | null;
  status: string;
  lastSyncedAt: Date | null;
  errorLog: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CatalogSyncRecord {
  return { ...row };
}

function toMappingRecord(row: {
  id: string;
  storeId: string;
  productId: string;
  externalProductId: string | null;
  externalCatalogId: string | null;
  status: string;
  lastPushedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProductMappingRecord {
  return { ...row };
}

function toMediaRecord(row: {
  id: string;
  storeId: string;
  externalMediaId: string | null;
  mediaType: string;
  caption: string | null;
  permalink: string | null;
  productTags: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ShoppableMediaRecord {
  return { ...row };
}
