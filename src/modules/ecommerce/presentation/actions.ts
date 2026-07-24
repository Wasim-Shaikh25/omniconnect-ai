"use server";

import { revalidatePath } from "next/cache";
import { requireRole, ForbiddenError } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import {
  connectStore,
  generateCoupon,
  syncProducts,
} from "../infrastructure/container";
import { connectStoreSchema } from "../application/connect-store";
import { generateCouponSchema } from "../application/generate-coupon";

export interface EcommerceActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

/** Ensures the current user's organization owns the target store. */
async function assertStoreInOrg(
  organizationId: string | null,
  storeId: string,
): Promise<boolean> {
  if (!organizationId) return false;
  const overview = await organizationQueries.getOrganizationOverview(
    organizationId,
  );
  return overview?.stores.some((s) => s.id === storeId) ?? false;
}

export async function connectStoreAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = connectStoreSchema.safeParse({
    storeId: formData.get("storeId"),
    provider: formData.get("provider") || undefined,
    shopDomain: formData.get("shopDomain") || undefined,
    accessToken: formData.get("accessToken") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    const result = await connectStore(parsed.data);
    if (!result.ok) return { error: result.error.message };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/stores/${parsed.data.storeId}`);
  return { ok: true, message: "Store connected." };
}

export async function syncProductsAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("STORE_OWNER");
  const storeId = String(formData.get("storeId") ?? "");
  if (!storeId) return { error: "Missing store." };

  if (!(await assertStoreInOrg(user.organizationId, storeId))) {
    return { error: "Store not found in your organization." };
  }

  const result = await syncProducts(storeId);
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/stores/${storeId}`);
  return { ok: true, message: `Synced ${result.value.count} products.` };
}

export async function generateCouponAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = generateCouponSchema.safeParse({
    storeId: formData.get("storeId"),
    code: formData.get("code"),
    discountPct: formData.get("discountPct"),
    expiresAt: formData.get("expiresAt") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  const result = await generateCoupon(parsed.data);
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/stores/${parsed.data.storeId}`);
  return { ok: true, message: `Coupon ${result.value.code} created.` };
}
