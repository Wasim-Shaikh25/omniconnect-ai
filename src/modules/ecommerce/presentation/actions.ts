"use server";

import { revalidatePath } from "next/cache";
import { requireRole, ForbiddenError } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { auditCommands } from "@/modules/users";
import {
  connectStore,
  generateCoupon,
  syncProducts,
  syncOrders,
  updateProduct,
  deleteProduct,
  updateCoupon,
  deleteCoupon,
} from "../infrastructure/container";
import { connectStoreSchema } from "../application/connect-store";
import { generateCouponSchema } from "../application/generate-coupon";
import { syncOrdersSchema } from "../application/sync-orders";
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
  userId: string | null,
  projectId: string,
): Promise<boolean> {
  if (!userId) return false;
  const overview = await organizationQueries.getOrganizationOverview(
    userId,
  );
  return overview?.stores.some((s) => s.id === projectId) ?? false;
}

export async function connectStoreAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("USER");

  const parsed = connectStoreSchema.safeParse({
    projectId: formData.get("projectId"),
    provider: formData.get("provider") || undefined,
    shopDomain: formData.get("shopDomain") || undefined,
    accessToken: formData.get("accessToken") || undefined,
    consumerKey: formData.get("consumerKey") || undefined,
    consumerSecret: formData.get("consumerSecret") || undefined,
    storeHash: formData.get("storeHash") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    const result = await connectStore(parsed.data);
    if (!result.ok) return { error: result.error.message };
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/stores/${parsed.data.projectId}`);
  return { ok: true, message: "Store connected." };
}

export async function syncOrdersAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("USER");
  const parsed = syncOrdersSchema.safeParse({
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  const result = await syncOrders(parsed.data.projectId);
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/stores/${parsed.data.projectId}`);
  revalidatePath(`/analytics`);
  return { ok: true, message: `Synced ${result.value.count} orders.` };
}

export async function syncProductsAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("USER");
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { error: "Missing store." };

  if (!(await assertStoreInOrg(user.userId, projectId))) {
    return { error: "Store not found in your organization." };
  }

  const result = await syncProducts(projectId);
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/stores/${projectId}`);
  return { ok: true, message: `Synced ${result.value.count} products. Marked ${result.value.deleted} removed.` };
}

export async function generateCouponAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("USER");

  const parsed = generateCouponSchema.safeParse({
    projectId: formData.get("projectId"),
    code: formData.get("code"),
    discountPct: formData.get("discountPct"),
    expiresAt: formData.get("expiresAt") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  const result = await generateCoupon(parsed.data);
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/stores/${parsed.data.projectId}`);
  return { ok: true, message: `Coupon ${result.value.code} created.` };
}

export async function updateProductAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("USER");

  const parsed = updateProductSchema.safeParse({
    productId: formData.get("productId"),
    projectId: formData.get("projectId"),
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

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await updateProduct(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: error instanceof Error ? error.message : "Update failed" };
  }

  await auditCommands.create({
    userId: user.userId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "PRODUCT_UPDATED",
    resource: "Product",
    resourceId: parsed.data.productId,
    details: `Product updated in store ${parsed.data.projectId}`,
  });

  revalidatePath(`/stores/${parsed.data.projectId}/products`);
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/catalog`);
  return { ok: true, message: "Product updated." };
}

export async function deleteProductAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("USER");

  const parsed = deleteProductSchema.safeParse({
    productId: formData.get("productId"),
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await deleteProduct(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: error instanceof Error ? error.message : "Delete failed" };
  }

  await auditCommands.create({
    userId: user.userId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "PRODUCT_DELETED",
    resource: "Product",
    resourceId: parsed.data.productId,
    details: `Product soft-deleted from store ${parsed.data.projectId}`,
  });

  revalidatePath(`/stores/${parsed.data.projectId}/products`);
  revalidatePath(`/stores/${parsed.data.projectId}/commerce/catalog`);
  return { ok: true, message: "Product deleted." };
}

export async function bulkDeleteProductsAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("USER");
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { error: "Missing store." };

  if (!(await assertStoreInOrg(user.userId, projectId))) {
    return { error: "Store not found in your organization." };
  }

  const idsRaw = formData.get("productIds");
  const ids = typeof idsRaw === "string" ? idsRaw.split(",").filter(Boolean) : [];
  if (ids.length === 0) return { error: "No products selected." };

  let deleted = 0;
  for (const productId of ids) {
    try {
      await deleteProduct({ productId, projectId });
      deleted++;
    } catch {
      // ignore missing / already deleted
    }
  }

  await auditCommands.create({
    userId: user.userId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "PRODUCT_BULK_DELETED",
    resource: "Product",
    resourceId: ids[0] ?? "",
    details: `${deleted} product(s) bulk-deleted from store ${projectId}`,
  });

  revalidatePath(`/stores/${projectId}/products`);
  revalidatePath(`/stores/${projectId}/commerce/catalog`);
  return { ok: true, message: `${deleted} product(s) deleted.` };
}

export async function updateCouponAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("USER");

  const parsed = updateCouponSchema.safeParse({
    couponId: formData.get("couponId"),
    projectId: formData.get("projectId"),
    discountPct: formData.get("discountPct") || undefined,
    status: formData.get("status") || undefined,
    expiresAt: formData.get("expiresAt") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await updateCoupon(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: error instanceof Error ? error.message : "Update failed" };
  }

  await auditCommands.create({
    userId: user.userId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "COUPON_UPDATED",
    resource: "Coupon",
    resourceId: parsed.data.couponId,
    details: `Coupon updated in store ${parsed.data.projectId}`,
  });

  revalidatePath(`/stores/${parsed.data.projectId}/coupons`);
  return { ok: true, message: "Coupon updated." };
}

export async function deleteCouponAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("USER");

  const parsed = deleteCouponSchema.safeParse({
    couponId: formData.get("couponId"),
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    await deleteCoupon(parsed.data);
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    return { error: error instanceof Error ? error.message : "Delete failed" };
  }

  await auditCommands.create({
    userId: user.userId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "COUPON_DELETED",
    resource: "Coupon",
    resourceId: parsed.data.couponId,
    details: `Coupon soft-deleted from store ${parsed.data.projectId}`,
  });

  revalidatePath(`/stores/${parsed.data.projectId}/coupons`);
  return { ok: true, message: "Coupon deleted." };
}

export async function bulkDeleteCouponsAction(
  _prev: EcommerceActionState,
  formData: FormData,
): Promise<EcommerceActionState> {
  const user = await requireRole("USER");
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { error: "Missing store." };

  if (!(await assertStoreInOrg(user.userId, projectId))) {
    return { error: "Store not found in your organization." };
  }

  const idsRaw = formData.get("couponIds");
  const ids = typeof idsRaw === "string" ? idsRaw.split(",").filter(Boolean) : [];
  if (ids.length === 0) return { error: "No coupons selected." };

  let deleted = 0;
  for (const couponId of ids) {
    try {
      await deleteCoupon({ couponId, projectId });
      deleted++;
    } catch {
      // ignore missing / already deleted
    }
  }

  await auditCommands.create({
    userId: user.userId ?? null,
    actorId: user.id,
    actorEmail: user.email ?? undefined,
    action: "COUPON_BULK_DELETED",
    resource: "Coupon",
    resourceId: ids[0] ?? "",
    details: `${deleted} coupon(s) bulk-deleted from store ${projectId}`,
  });

  revalidatePath(`/stores/${projectId}/coupons`);
  return { ok: true, message: `${deleted} coupon(s) deleted.` };
}
