"use server";

import { revalidatePath } from "next/cache";
import { requireRole, ForbiddenError } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { auditCommands } from "@/modules/users";
import {
  connectStore,
  generateCoupon,
  syncProducts,
  updateProduct,
  deleteProduct,
  updateCoupon,
  deleteCoupon,
} from "../infrastructure/container";
import { connectStoreSchema } from "../application/connect-store";
import { generateCouponSchema } from "../application/generate-coupon";
import { updateProductSchema } from "../application/update-product";
import { deleteProductSchema } from "../application/delete-product";
import { updateCouponSchema } from "../application/update-coupon";
import { deleteCouponSchema } from "../application/delete-coupon";

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
  return { ok: true, message: `Synced ${result.value.count} products. Marked ${result.value.deleted} removed.` };
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

export async function updateProductAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = updateProductSchema.safeParse({
    productId: formData.get("productId"),
    storeId: formData.get("storeId"),
    title: formData.get("title") || undefined,
    description: formData.get("description") || null,
    price: formData.get("price") || null,
    currency: formData.get("currency") || null,
    inventory: formData.get("inventory") || null,
    imageUrl: formData.get("imageUrl") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await updateProduct(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: error instanceof Error ? error.message : "Update failed" };
  }

  await auditCommands.create({
    organizationId: user.organizationId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "PRODUCT_UPDATED",
    resource: "Product",
    resourceId: parsed.data.productId,
    details: `Product updated in store ${parsed.data.storeId}`,
  });

  revalidatePath(`/stores/${parsed.data.storeId}/products`);
  revalidatePath(`/stores/${parsed.data.storeId}/commerce/catalog`);
  return { ok: true, message: "Product updated." };
}

export async function deleteProductAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = deleteProductSchema.safeParse({
    productId: formData.get("productId"),
    storeId: formData.get("storeId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await deleteProduct(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: error instanceof Error ? error.message : "Delete failed" };
  }

  await auditCommands.create({
    organizationId: user.organizationId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "PRODUCT_DELETED",
    resource: "Product",
    resourceId: parsed.data.productId,
    details: `Product soft-deleted from store ${parsed.data.storeId}`,
  });

  revalidatePath(`/stores/${parsed.data.storeId}/products`);
  revalidatePath(`/stores/${parsed.data.storeId}/commerce/catalog`);
  return { ok: true, message: "Product deleted." };
}

export async function bulkDeleteProductsAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("STORE_OWNER");
  const storeId = String(formData.get("storeId") ?? "");
  if (!storeId) return { error: "Missing store." };

  if (!(await assertStoreInOrg(user.organizationId, storeId))) {
    return { error: "Store not found in your organization." };
  }

  const idsRaw = formData.get("productIds");
  const ids = typeof idsRaw === "string" ? idsRaw.split(",").filter(Boolean) : [];
  if (ids.length === 0) return { error: "No products selected." };

  let deleted = 0;
  for (const productId of ids) {
    try {
      await deleteProduct({ productId, storeId });
      deleted++;
    } catch {
      // ignore missing / already deleted
    }
  }

  await auditCommands.create({
    organizationId: user.organizationId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "PRODUCT_BULK_DELETED",
    resource: "Product",
    resourceId: ids[0] ?? "",
    details: `${deleted} product(s) bulk-deleted from store ${storeId}`,
  });

  revalidatePath(`/stores/${storeId}/products`);
  revalidatePath(`/stores/${storeId}/commerce/catalog`);
  return { ok: true, message: `${deleted} product(s) deleted.` };
}

export async function updateCouponAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = updateCouponSchema.safeParse({
    couponId: formData.get("couponId"),
    storeId: formData.get("storeId"),
    discountPct: formData.get("discountPct") || undefined,
    status: formData.get("status") || undefined,
    expiresAt: formData.get("expiresAt") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await updateCoupon(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: error instanceof Error ? error.message : "Update failed" };
  }

  await auditCommands.create({
    organizationId: user.organizationId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "COUPON_UPDATED",
    resource: "Coupon",
    resourceId: parsed.data.couponId,
    details: `Coupon updated in store ${parsed.data.storeId}`,
  });

  revalidatePath(`/stores/${parsed.data.storeId}/coupons`);
  return { ok: true, message: "Coupon updated." };
}

export async function deleteCouponAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("STORE_OWNER");

  const parsed = deleteCouponSchema.safeParse({
    couponId: formData.get("couponId"),
    storeId: formData.get("storeId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.organizationId, parsed.data.storeId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await deleteCoupon(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: error instanceof Error ? error.message : "Delete failed" };
  }

  await auditCommands.create({
    organizationId: user.organizationId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "COUPON_DELETED",
    resource: "Coupon",
    resourceId: parsed.data.couponId,
    details: `Coupon soft-deleted from store ${parsed.data.storeId}`,
  });

  revalidatePath(`/stores/${parsed.data.storeId}/coupons`);
  return { ok: true, message: "Coupon deleted." };
}

export async function bulkDeleteCouponsAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("STORE_OWNER");
  const storeId = String(formData.get("storeId") ?? "");
  if (!storeId) return { error: "Missing store." };

  if (!(await assertStoreInOrg(user.organizationId, storeId))) {
    return { error: "Store not found in your organization." };
  }

  const idsRaw = formData.get("couponIds");
  const ids = typeof idsRaw === "string" ? idsRaw.split(",").filter(Boolean) : [];
  if (ids.length === 0) return { error: "No coupons selected." };

  let deleted = 0;
  for (const couponId of ids) {
    try {
      await deleteCoupon({ couponId, storeId });
      deleted++;
    } catch {
      // ignore missing / already deleted
    }
  }

  await auditCommands.create({
    organizationId: user.organizationId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "COUPON_BULK_DELETED",
    resource: "Coupon",
    resourceId: ids[0] ?? "",
    details: `${deleted} coupon(s) bulk-deleted from store ${storeId}`,
  });

  revalidatePath(`/stores/${storeId}/coupons`);
  return { ok: true, message: `${deleted} coupon(s) deleted.` };
}
