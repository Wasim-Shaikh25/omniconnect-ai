import { z } from "zod";
import type { Prisma } from "@prisma/client";
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
    createdBy: string;
  }): Promise<SaaSCouponRecord>;
  findByCode(code: string, tx?: Prisma.TransactionClient): Promise<SaaSCouponRecord | null>;
  findById(id: string): Promise<SaaSCouponRecord | null>;
  list(pagination?: PaginationInput): Promise<PaginatedResult<SaaSCouponRecord>>;
  incrementUsage(id: string, maxUses: number | null, tx?: Prisma.TransactionClient): Promise<boolean>;
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
  appliesTo: z.array(z.enum(["FREE", "PRO", "BUSINESS"])).default([]),
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

    const coupon = await deps.coupons.create({
      ...parsed.data,
      createdBy,
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
