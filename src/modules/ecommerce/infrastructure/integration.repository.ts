import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import { encryptString, decryptString } from "@/shared/security/encryption";
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
  metadata: Prisma.JsonValue;
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
    metadata: (i.metadata as Record<string, unknown>) ?? null,
  };
}

export class PrismaIntegrationRepository implements IntegrationRepository {
  async upsertEcommerce(input: {
    storeId: string;
    provider: EcommerceProvider;
    shopDomain: string | null;
    accessToken: string | null;
    refreshToken?: string | null;
    scopes: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<IntegrationRecord> {
    const existing = await prisma.integration.findFirst({
      where: { storeId: input.storeId, type: "ECOMMERCE" },
    });

    const data = {
      type: "ECOMMERCE" as const,
      provider: input.provider,
      externalId: input.shopDomain,
      accessToken: await encryptString(input.accessToken),
      refreshToken: await encryptString(input.refreshToken ?? null),
      scopes: input.scopes,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
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
    return found ? toRecord(found as PrismaIntegration) : null;
  }

  async findCredentialsByStore(storeId: string): Promise<{
    provider: string;
    shopDomain: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    metadata: Record<string, unknown> | null;
  } | null> {
    const found = await prisma.integration.findFirst({
      where: { storeId, type: "ECOMMERCE" },
      select: { provider: true, externalId: true, accessToken: true, refreshToken: true, metadata: true },
    });
    if (!found) return null;
    return {
      provider: found.provider,
      shopDomain: found.externalId,
      accessToken: await decryptString(found.accessToken),
      refreshToken: await decryptString(found.refreshToken),
      metadata: (found.metadata as Record<string, unknown>) ?? null,
    };
  }
}
