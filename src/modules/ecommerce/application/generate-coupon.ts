import { z } from "zod";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability/logger";
import { Result, ok, err } from "@/shared/kernel";
import { ConnectorError, StoreNotConnectedError } from "../domain/errors";
import { CouponGenerated } from "../domain/events";
import type {
  ConnectorFactory,
  CouponRecord,
  CouponRepository,
} from "./ports";

export const generateCouponSchema = z.object({
  projectId: z.string().min(1),
  code: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, "Use uppercase letters, numbers, _ or -"),
  discountPct: z.coerce.number().int().min(1).max(100),
  expiresAt: z.coerce.date().optional(),
  customerId: z.string().optional(),
  pushToProvider: z.coerce.boolean().optional().default(true),
});

export type GenerateCouponInput = z.infer<typeof generateCouponSchema>;

export function makeGenerateCoupon(deps: {
  connectors: ConnectorFactory;
  coupons: CouponRepository;
}) {
  return async function generateCoupon(
    raw: GenerateCouponInput,
  ): Promise<Result<CouponRecord, StoreNotConnectedError | ConnectorError>> {
    const input = generateCouponSchema.parse(raw);

    let provider: string | null = null;
    if (input.pushToProvider) {
      let connector;
      try {
        connector = await deps.connectors.forStore(input.projectId);
      } catch {
        return err(new StoreNotConnectedError(input.projectId));
      }

      provider = connector.provider;

      try {
        await connector.generateCoupon({
          code: input.code,
          discountPct: input.discountPct,
          expiresAt: input.expiresAt ?? null,
        });
      } catch {
        return err(new ConnectorError(provider, "generateCoupon"));
      }
    }

    const coupon = await deps.coupons.create({
      projectId: input.projectId,
      code: input.code,
      discountPct: input.discountPct,
      expiresAt: input.expiresAt ?? null,
      customerId: input.customerId ?? null,
    });

    await eventBus.publish(
      new CouponGenerated(input.projectId, {
        projectId: input.projectId,
        couponId: coupon.id,
        code: coupon.code,
        discountPct: coupon.discountPct,
        customerId: input.customerId ?? null,
      }),
    );

    logger.info("ecommerce.couponGenerated", {
      projectId: input.projectId,
      provider,
      code: coupon.code,
    });

    return ok(coupon);
  };
}
