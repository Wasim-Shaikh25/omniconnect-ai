import { prisma } from "@/shared/database";
import { StoreRecord, StoreRepository } from "../application/ports";
import { EcommerceProvider } from "../domain/provider";
import { StoreLimitError } from "../domain/errors";

type PrismaStore = {
  id: string;
  name: string;
  provider: string;
  domain: string | null;
  organizationId: string;
  archivedAt: Date | null;
  deletedAt: Date | null;
  lastProductSyncAt: Date | null;
  createdAt: Date;
};

function toRecord(store: PrismaStore): StoreRecord {
  return {
    id: store.id,
    name: store.name,
    provider: store.provider as EcommerceProvider,
    domain: store.domain,
    organizationId: store.organizationId,
    archivedAt: store.archivedAt,
    deletedAt: store.deletedAt,
    lastProductSyncAt: store.lastProductSyncAt,
    createdAt: store.createdAt,
  };
}

function notDeleted() {
  return { deletedAt: null };
}

export class PrismaStoreRepository implements StoreRepository {
  async create(
    input: {
      organizationId: string;
      name: string;
      provider: EcommerceProvider;
      domain: string | null;
    },
    maxStores?: number | null,
  ): Promise<StoreRecord> {
    const shouldEnforce = maxStores !== undefined && maxStores !== null;

    const store = shouldEnforce
      ? await prisma.$transaction(
          async (tx) => {
            const count = await tx.store.count({
              where: { organizationId: input.organizationId },
            });
            if (count >= maxStores) {
              throw new StoreLimitError(
                `Your plan allows up to ${maxStores} store(s). Upgrade to add more.`,
              );
            }
            return tx.store.create({
              data: {
                organizationId: input.organizationId,
                name: input.name,
                provider: input.provider,
                domain: input.domain,
              },
            });
          },
          { isolationLevel: "Serializable" },
        )
      : await prisma.store.create({
          data: {
            organizationId: input.organizationId,
            name: input.name,
            provider: input.provider,
            domain: input.domain,
          },
        });

    return toRecord(store);
  }

  async listByOrganization(
    organizationId: string,
    includeDeleted = false,
  ): Promise<StoreRecord[]> {
    const stores = await prisma.store.findMany({
      where: {
        organizationId,
        ...(includeDeleted ? {} : notDeleted()),
      },
      orderBy: { createdAt: "asc" },
    });
    return stores.map(toRecord);
  }

  async findById(id: string, includeDeleted = false): Promise<StoreRecord | null> {
    const store = await prisma.store.findFirst({
      where: { id, ...(includeDeleted ? {} : notDeleted()) },
    });
    return store ? toRecord(store) : null;
  }

  async update(
    id: string,
    input: { name?: string; provider?: EcommerceProvider; domain?: string | null },
  ): Promise<StoreRecord | null> {
    const existing = await this.findById(id, true);
    if (!existing || existing.deletedAt) return null;

    const store = await prisma.store.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.provider !== undefined ? { provider: input.provider } : {}),
        ...(input.domain !== undefined ? { domain: input.domain } : {}),
      },
    });
    return toRecord(store);
  }

  async archive(id: string): Promise<StoreRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const store = await prisma.store.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return toRecord(store);
  }

  async restore(id: string): Promise<StoreRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const store = await prisma.store.update({
      where: { id },
      data: { archivedAt: null },
    });
    return toRecord(store);
  }

  async delete(id: string): Promise<StoreRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const store = await prisma.store.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return toRecord(store);
  }
}
