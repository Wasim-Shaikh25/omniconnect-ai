"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/modules/auth";
import { auditCommands } from "@/modules/users";
import { logger } from "@/shared/observability/logger";
import {
  createSaaSCouponSchema,
  makeCreateSaaSCoupon,
  makeValidateSaaSCoupon,
} from "../application/saas-coupon";
import { PrismaSaaSCouponRepository } from "../infrastructure/saas-coupon.repository";

const couponRepository = new PrismaSaaSCouponRepository();
const createSaaSCoupon = makeCreateSaaSCoupon({ coupons: couponRepository });
const validateSaaSCoupon = makeValidateSaaSCoupon({ coupons: couponRepository });

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
    organizationId: "platform",
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

export async function listSaaSCouponsAction() {
  await requireSuperAdmin();
  return couponRepository.list();
}

export async function applyCouponToCheckoutAction(code: string, plan: string) {
  const result = await validateSaaSCoupon(code, plan);
  if (!result.ok) return { error: result.error.message };

  const coupon = result.value;
  if (!coupon.stripePromotionCodeId) {
    return { error: "Coupon is not backed by a Stripe promotion code" };
  }

  return {
    ok: true,
    promotionCodeId: coupon.stripePromotionCodeId,
    coupon: { code: coupon.code, discountPct: coupon.discountPct },
  };
}

export async function incrementCouponUsageAction(id: string) {
  try {
    await couponRepository.incrementUsage(id);
  } catch (error) {
    logger.error("saasCoupon.incrementUsageFailed", {
      id,
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}
