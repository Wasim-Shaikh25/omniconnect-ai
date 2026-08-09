import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import { StoreRecord, StoreRepository } from "../application/ports";
import { EcommerceProvider, isEcommerceProvider } from "../domain/provider";
import { StoreLimitError, StoreNameExistsError } from "../domain/errors";

type PrismaStore = {
  id: string;
  name: string;
  provider: string | null;
  domain: string | null;
  userId: string;
  archivedAt: Date | null;
  deletedAt: Date | null;
  lastProductSyncAt: Date | null;
  createdAt: Date;
};

function toRecord(store: PrismaStore): StoreRecord {
  const provider = isEcommerceProvider(store.provider) ? store.provider : "CUSTOM";
  return {
    id: store.id,
    name: store.name,
    provider,
    domain: store.domain,
    userId: store.userId,
    archivedAt: store.archivedAt,
    deletedAt: store.deletedAt,
    lastProductSyncAt: store.lastProductSyncAt,
    createdAt: store.createdAt,
  };
}

function notDeleted() {
  return { deletedAt: null };
}

async function ensureWorkspace(
  tx: { workspace: Prisma.WorkspaceDelegate },
  userId: string,
  name: string,
): Promise<string> {
  const existing = await tx.workspace.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) return existing.id;
  try {
    const created = await tx.workspace.create({
      data: { userId, name },
    });
    return created.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const fallback = await tx.workspace.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (fallback) return fallback.id;
    }
    throw error;
  }
}

export class PrismaStoreRepository implements StoreRepository {
  async create(
    input: {
      userId: string;
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
            const count = await tx.project.count({
              where: { userId: input.userId, deletedAt: null },
            });
            if (count >= maxStores) {
              throw new StoreLimitError(
                `Your plan allows up to ${maxStores} store(s). Upgrade to add more.`,
              );
            }
            const workspaceId = await ensureWorkspace(tx, input.userId, input.name);
            try {
              return await tx.project.create({
                data: {
                  workspaceId,
                  userId: input.userId,
                  name: input.name,
                  provider: input.provider,
                  domain: input.domain,
                },
              });
            } catch (error) {
              if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
              ) {
                throw new StoreNameExistsError(input.name);
              }
              throw error;
            }
          },
          { isolationLevel: "Serializable" },
        )
      : await prisma.$transaction(async (tx) => {
          const workspaceId = await ensureWorkspace(tx, input.userId, input.name);
          try {
            return await tx.project.create({
              data: {
                workspaceId,
                userId: input.userId,
                name: input.name,
                provider: input.provider,
                domain: input.domain,
              },
            });
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            ) {
              throw new StoreNameExistsError(input.name);
            }
            throw error;
          }
        });

    return toRecord(store);
  }

  async listByOrganization(
    userId: string,
    includeDeleted = false,
    limit = 1000,
  ): Promise<StoreRecord[]> {
    const stores = await prisma.project.findMany({
      where: {
        userId,
        ...(includeDeleted ? {} : notDeleted()),
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return stores.map(toRecord);
  }

  async findById(id: string, includeDeleted = false): Promise<StoreRecord | null> {
    const store = await prisma.project.findFirst({
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

    const store = await prisma.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.provider !== undefined ? { provider: input.provider } : {}),
        ...(input.domain !== undefined ? { domain: input.domain } : {}),
      },
    });
    return toRecord(store);
  }

}
