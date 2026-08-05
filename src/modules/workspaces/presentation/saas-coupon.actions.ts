"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/modules/auth";
import { auditCommands } from "@/modules/users";
import { createSaaSCouponSchema, makeCreateSaaSCoupon } from "../application/saas-coupon";
import { PrismaSaaSCouponRepository } from "../infrastructure/saas-coupon.repository";

const couponRepository = new PrismaSaaSCouponRepository();
const createSaaSCoupon = makeCreateSaaSCoupon({ coupons: couponRepository });

export interface CouponActionState {
  error?: string;
  ok?: boolean;
  coupon?: { id: string; code: string; discountPct: number };
}

export async function createSaaSCouponAction(
  _prev: CouponActionState,
  formData: FormData,
): Promise<CouponActionState> {
  const admin = await requireSuperAdmin();

  const raw = {
    code: formData.get("code"),
    label: formData.get("label") || undefined,
    discountPct: formData.get("discountPct"),
    maxUses: formData.get("maxUses") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    appliesTo: formData.getAll("appliesTo"),
  };

  const parsed = createSaaSCouponSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await createSaaSCoupon(parsed.data, admin.id);
  if (!result.ok) return { error: result.error.message };

  await auditCommands.create({
    userId: admin.userId ?? null,
    actorId: admin.id,
    actorEmail: admin.email,
    action: "SAAS_COUPON_CREATED",
    resource: "SaaSCoupon",
    resourceId: result.value.id,
    details: `Created ${result.value.code} (${result.value.discountPct}% off)`,
  });

  revalidatePath("/admin/coupons");
  return {
    ok: true,
    coupon: { id: result.value.id, code: result.value.code, discountPct: result.value.discountPct },
  };
}

const DEFAULT_PAGE_LIMIT = 20;

function parsePage(raw: string | number | undefined) {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : typeof raw === "number" ? raw : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseLimit(raw: string | number | undefined) {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : typeof raw === "number" ? raw : DEFAULT_PAGE_LIMIT;
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : DEFAULT_PAGE_LIMIT;
}

export async function listSaaSCouponsAction(
  page?: string | number,
  limit?: string | number,
) {
  await requireSuperAdmin();
  return couponRepository.list({
    page: parsePage(page),
    limit: parseLimit(limit),
  });
}
