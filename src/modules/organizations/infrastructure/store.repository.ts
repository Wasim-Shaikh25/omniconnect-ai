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
  createdAt: Date;
};

function toRecord(store: PrismaStore): StoreRecord {
  return {
    id: store.id,
    name: store.name,
    provider: store.provider as EcommerceProvider,
    domain: store.domain,
    organizationId: store.organizationId,
    createdAt: store.createdAt,
  };
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

  async listByOrganization(organizationId: string): Promise<StoreRecord[]> {
    const stores = await prisma.store.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
    return stores.map(toRecord);
  }

  async findById(id: string): Promise<StoreRecord | null> {
    const store = await prisma.store.findUnique({ where: { id } });
    return store ? toRecord(store) : null;
  }
}
