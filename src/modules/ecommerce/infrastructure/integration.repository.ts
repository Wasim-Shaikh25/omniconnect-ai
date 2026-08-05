import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import { encryptString, decryptString } from "@/shared/security/encryption";
import type { EcommerceProvider } from "@/modules/workspaces";
import type {
  IntegrationRecord,
  IntegrationRepository,
} from "../application/ports";

type PrismaIntegration = {
  id: string;
  projectId: string;
  provider: string;
  baseUrl: string | null;
  config: Prisma.JsonValue | null;
  createdAt: Date;
};

function configAsRecord(
  config: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return null;
}

function toRecord(i: PrismaIntegration): IntegrationRecord {
  return {
    id: i.id,
    projectId: i.projectId,
    provider: i.provider,
    shopDomain: i.baseUrl,
    scopes: null,
    connectedAt: i.createdAt,
    metadata: configAsRecord(i.config),
  };
}

export class PrismaIntegrationRepository implements IntegrationRepository {
  async upsertEcommerce(input: {
    projectId: string;
    provider: EcommerceProvider;
    shopDomain: string | null;
    accessToken: string | null;
    refreshToken?: string | null;
    scopes: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<IntegrationRecord> {
    const existing = await prisma.ecommerceConnection.findFirst({
      where: { projectId: input.projectId },
    });

    const config: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput =
      input.metadata
        ? ({ ...input.metadata, scopes: input.scopes } as Prisma.InputJsonValue)
        : input.scopes
          ? ({ scopes: input.scopes } as Prisma.InputJsonValue)
          : Prisma.JsonNull;

    const data = {
      provider: input.provider,
      baseUrl: input.shopDomain,
      accessToken: await encryptString(input.accessToken),
      refreshToken: await encryptString(input.refreshToken ?? null),
      config,
      projectId: input.projectId,
      isActive: true,
    };

    const saved = existing
      ? await prisma.ecommerceConnection.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.ecommerceConnection.create({ data });

    return toRecord(saved);
  }

  async findEcommerceByStore(
    projectId: string,
  ): Promise<IntegrationRecord | null> {
    const found = await prisma.ecommerceConnection.findFirst({
      where: { projectId },
    });
    return found ? toRecord(found) : null;
  }

  async findByShopDomain(
    shopDomain: string,
  ): Promise<IntegrationRecord | null> {
    const found = await prisma.ecommerceConnection.findFirst({
      where: {
        baseUrl: { equals: shopDomain, mode: "insensitive" },
      },
    });
    return found ? toRecord(found) : null;
  }

  async findCredentialsByStore(projectId: string): Promise<{
    provider: string;
    shopDomain: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    metadata: Record<string, unknown> | null;
  } | null> {
    const found = await prisma.ecommerceConnection.findFirst({
      where: { projectId },
      select: {
        provider: true,
        baseUrl: true,
        accessToken: true,
        refreshToken: true,
        config: true,
      },
    });
    if (!found) return null;
    return {
      provider: found.provider,
      shopDomain: found.baseUrl,
      accessToken: await decryptString(found.accessToken),
      refreshToken: await decryptString(found.refreshToken),
      metadata: configAsRecord(found.config),
    };
  }
}
