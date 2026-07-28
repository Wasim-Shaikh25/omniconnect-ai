import { z } from "zod";
import Stripe from "stripe";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/observability/logger";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";
import { Result, ok, err } from "@/shared/kernel";

export interface SaaSCouponRecord {
  id: string;
  code: string;
  label: string | null;
  discountPct: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  appliesTo: string[];
  isActive: boolean;
  stripeCouponId: string | null;
  stripePromotionCodeId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaaSCouponRepository {
  create(input: {
    code: string;
    label?: string;
    discountPct: number;
    maxUses?: number | null;
    expiresAt?: Date | null;
    appliesTo: string[];
    stripeCouponId?: string | null;
    stripePromotionCodeId?: string | null;
    createdBy: string;
  }): Promise<SaaSCouponRecord>;
  findByCode(code: string): Promise<SaaSCouponRecord | null>;
  findById(id: string): Promise<SaaSCouponRecord | null>;
  list(pagination?: PaginationInput): Promise<PaginatedResult<SaaSCouponRecord>>;
  incrementUsage(id: string, maxUses: number | null): Promise<boolean>;
}

export const createSaaSCouponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, _, or -"),
  label: z.string().max(100).optional(),
  discountPct: z.coerce.number().int().min(1).max(100),
  maxUses: z.coerce.number().int().min(1).optional(),
  expiresAt: z.coerce.date().optional(),
  appliesTo: z.array(z.enum(["FREE", "STARTER", "PRO"])).default([]),
});

export type CreateSaaSCouponInput = z.infer<typeof createSaaSCouponSchema>;

export function makeCreateSaaSCoupon(deps: {
  coupons: SaaSCouponRepository;
}) {
  return async function createSaaSCoupon(
    input: CreateSaaSCouponInput,
    createdBy: string,
  ): Promise<Result<SaaSCouponRecord, Error>> {
    const parsed = createSaaSCouponSchema.safeParse(input);
    if (!parsed.success) {
      return err(new Error(parsed.error.issues[0]?.message ?? "Invalid input"));
    }

    const existing = await deps.coupons.findByCode(parsed.data.code);
    if (existing) return err(new Error("Coupon code already exists"));

    let stripeCouponId: string | null = null;
    let stripePromotionCodeId: string | null = null;

    if (env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        const stripeCoupon = await stripe.coupons.create({
          percent_off: parsed.data.discountPct,
          duration: "forever",
          max_redemptions: parsed.data.maxUses,
          redeem_by: parsed.data.expiresAt
            ? Math.floor(parsed.data.expiresAt.getTime() / 1000)
            : undefined,
        });
        stripeCouponId = stripeCoupon.id;

        const promotionCode = await stripe.promotionCodes.create({
          coupon: stripeCoupon.id,
          code: parsed.data.code,
        });
        stripePromotionCodeId = promotionCode.id;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stripe coupon creation failed";
        logger.error("saasCoupon.stripeCreateFailed", { code: parsed.data.code, error: message });
        return err(new Error(`Stripe coupon creation failed: ${message}`));
      }
    }

    const coupon = await deps.coupons.create({
      ...parsed.data,
      createdBy,
      stripeCouponId,
      stripePromotionCodeId,
    });

    logger.info("saasCoupon.created", {
      id: coupon.id,
      code: coupon.code,
      discountPct: coupon.discountPct,
      createdBy,
    });

    return ok(coupon);
  };
}

export function makeValidateSaaSCoupon(deps: { coupons: SaaSCouponRepository }) {
  return async function validateSaaSCoupon(
    code: string,
    plan: string,
  ): Promise<Result<SaaSCouponRecord, Error>> {
    const coupon = await deps.coupons.findByCode(code.toUpperCase().trim());
    if (!coupon) return err(new Error("Invalid coupon code"));
    if (!coupon.isActive) return err(new Error("Coupon is inactive"));
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return err(new Error("Coupon has expired"));
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return err(new Error("Coupon usage limit reached"));
    }
    if (coupon.appliesTo.length > 0 && !coupon.appliesTo.includes(plan)) {
      return err(new Error("Coupon not valid for this plan"));
    }
    return ok(coupon);
  };
}
