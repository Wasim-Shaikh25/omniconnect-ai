import { prisma } from "@/shared/database";
import type { EcommerceProvider } from "@/modules/organizations";
import type {
  IntegrationRecord,
  IntegrationRepository,
} from "../application/ports";

type PrismaIntegration = {
  id: string;
  storeId: string;
  provider: string;
  externalId: string | null;
  scopes: string | null;
  createdAt: Date;
};

function toRecord(i: PrismaIntegration): IntegrationRecord {
  return {
    id: i.id,
    storeId: i.storeId,
    provider: i.provider,
    shopDomain: i.externalId,
    scopes: i.scopes,
    connectedAt: i.createdAt,
  };
}

export class PrismaIntegrationRepository implements IntegrationRepository {
  async upsertEcommerce(input: {
    storeId: string;
    provider: EcommerceProvider;
    shopDomain: string | null;
    accessToken: string | null;
    scopes: string | null;
  }): Promise<IntegrationRecord> {
    const existing = await prisma.integration.findFirst({
      where: { storeId: input.storeId, type: "ECOMMERCE" },
    });

    const data = {
      type: "ECOMMERCE" as const,
      provider: input.provider,
      externalId: input.shopDomain,
      accessToken: input.accessToken,
      scopes: input.scopes,
      storeId: input.storeId,
    };

    const saved = existing
      ? await prisma.integration.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.integration.create({ data });

    return toRecord(saved);
  }

  async findEcommerceByStore(
    storeId: string,
  ): Promise<IntegrationRecord | null> {
    const found = await prisma.integration.findFirst({
      where: { storeId, type: "ECOMMERCE" },
    });
    return found ? toRecord(found) : null;
  }

  async findCredentialsByStore(storeId: string): Promise<{
    provider: string;
    shopDomain: string | null;
    accessToken: string | null;
  } | null> {
    const found = await prisma.integration.findFirst({
      where: { storeId, type: "ECOMMERCE" },
      select: { provider: true, externalId: true, accessToken: true },
    });
    if (!found) return null;
    return {
      provider: found.provider,
      shopDomain: found.externalId,
      accessToken: found.accessToken,
    };
  }
}
