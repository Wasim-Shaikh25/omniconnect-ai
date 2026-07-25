"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
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
}

async function requireStoreAccess(storeId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, ok: false };
  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const store = overview?.stores.find((s) => s.id === storeId);
  if (!store) return { user, ok: false };
  return { user, ok: true };
}

export async function listCommerceCatalogAction(
  storeId: string,
): Promise<CommerceCatalogView> {
  const access = await requireStoreAccess(storeId);
  if (!access.ok) return { sync: null, mappings: [], media: [], products: [] };

  const [sync, mappings, media, products] = await Promise.all([
    commerceQueries.getLatestCatalogSync(storeId),
    commerceQueries.listProductMappings(storeId),
    commerceQueries.listShoppableMedia(storeId),
    (await import("@/modules/ecommerce")).ecommerceQueries.listProducts(storeId, 100),
  ]);

  return { sync, mappings, media, products };
}

export async function syncMetaCatalogAction(
  prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = syncSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const access = await requireStoreAccess(parsed.data.storeId);
  if (!access.ok) return { ok: false, error: "Not authorized" };

  try {
    await commerceService.syncProductCatalog(parsed.data.storeId);
    revalidatePath(`/stores/${parsed.data.storeId}/commerce/catalog`);
    return { ok: true };
  } catch (error) {
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

  const access = await requireStoreAccess(parsed.data.storeId);
  if (!access.ok) return { ok: false, error: "Not authorized" };

  try {
    await commerceService.createShoppableMedia(parsed.data.storeId, parsed.data);
    revalidatePath(`/stores/${parsed.data.storeId}/commerce/catalog`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Publish failed",
    };
  }
}
