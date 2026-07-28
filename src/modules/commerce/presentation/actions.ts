"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, ForbiddenError } from "@/modules/auth";
import { tenantGuard } from "@/modules/organizations";
import { updateMarketingMemory } from "@/modules/intelligence";
import type { ProductScoreRecord } from "@/modules/intelligence";
import { commerceQueries, commerceService } from "../infrastructure/container";

const syncSchema = z.object({
  storeId: z.string().min(1),
});

const createMediaSchema = z.object({
  storeId: z.string().min(1),
  mediaType: z.enum(["REEL", "POST", "STORY"]),
  caption: z.string().optional(),
  productTagIds: z.array(z.string().min(1)).min(1),
});

export interface CommerceCatalogView {
  sync: Awaited<ReturnType<typeof commerceQueries.getLatestCatalogSync>>;
  mappings: Awaited<ReturnType<typeof commerceQueries.listProductMappings>>;
  media: Awaited<ReturnType<typeof commerceQueries.listShoppableMedia>>;
  products: Awaited<ReturnType<typeof import("@/modules/ecommerce").ecommerceQueries.listProducts>>;
  productScores: ProductScoreRecord[];
}

export async function listCommerceCatalogAction(
  storeId: string,
): Promise<CommerceCatalogView> {
  let user: Awaited<ReturnType<typeof requireRole>> | null = null;
  try {
    user = await requireRole("STAFF");
    await tenantGuard.assertStoreAccess(user, storeId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { sync: null, mappings: [], media: [], products: [], productScores: [] };
    }
    throw error;
  }

  const [sync, mappings, media, products, memory] = await Promise.all([
    commerceQueries.getLatestCatalogSync(storeId),
    commerceQueries.listProductMappings(storeId),
    commerceQueries.listShoppableMedia(storeId),
    (await import("@/modules/ecommerce")).ecommerceQueries.listProducts(storeId, 100),
    updateMarketingMemory(user.organizationId ?? "", storeId),
  ]);

  return { sync, mappings, media, products, productScores: memory?.productScores ?? [] };
}

export async function syncMetaCatalogAction(
  prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = syncSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  try {
    const user = await requireRole("STORE_OWNER");
    await tenantGuard.assertStoreAccess(user, parsed.data.storeId);
    await commerceService.syncProductCatalog(parsed.data.storeId);
    revalidatePath(`/stores/${parsed.data.storeId}/commerce/catalog`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: "Not authorized" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

export async function createShoppableMediaAction(
  prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const entries = Object.fromEntries(formData.entries());
  const parsed = createMediaSchema.safeParse({
    ...entries,
    productTagIds: formData.getAll("productTagIds"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  try {
    const user = await requireRole("STORE_OWNER");
    await tenantGuard.assertStoreAccess(user, parsed.data.storeId);
    await commerceService.createShoppableMedia(parsed.data.storeId, parsed.data);
    revalidatePath(`/stores/${parsed.data.storeId}/commerce/catalog`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: "Not authorized" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Publish failed",
    };
  }
}
