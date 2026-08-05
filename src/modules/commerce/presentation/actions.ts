"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, ForbiddenError } from "@/modules/auth";
import { tenantGuard } from "@/modules/workspaces";
import { updateMarketingMemory } from "@/modules/intelligence/server";
import type { ProductScoreRecord } from "@/modules/intelligence";
import { commerceQueries, commerceService } from "../infrastructure/container";

const syncSchema = z.object({
  projectId: z.string().min(1),
});

const createMediaSchema = z.object({
  projectId: z.string().min(1),
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
  projectId: string,
): Promise<CommerceCatalogView> {
  let user: Awaited<ReturnType<typeof requireRole>> | null = null;
  try {
    user = await requireRole("USER");
    await tenantGuard.assertStoreAccess(user, projectId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { sync: null, mappings: [], media: [], products: [], productScores: [] };
    }
    throw error;
  }

  const [sync, mappings, media, products, memory] = await Promise.all([
    commerceQueries.getLatestCatalogSync(projectId),
    commerceQueries.listProductMappings(projectId),
    commerceQueries.listShoppableMedia(projectId),
    (await import("@/modules/ecommerce")).ecommerceQueries.listProducts(projectId, 100),
    updateMarketingMemory(user.userId ?? "", projectId),
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
    const user = await requireRole("USER");
    await tenantGuard.assertStoreAccess(user, parsed.data.projectId);
    await commerceService.syncProductCatalog(parsed.data.projectId);
    revalidatePath(`/stores/${parsed.data.projectId}/commerce/catalog`);
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
    const user = await requireRole("USER");
    await tenantGuard.assertStoreAccess(user, parsed.data.projectId);
    await commerceService.createShoppableMedia(parsed.data.projectId, parsed.data);
    revalidatePath(`/stores/${parsed.data.projectId}/commerce/catalog`);
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
