import { generateCoupon } from "../infrastructure/container";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function generateCouponCode(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OMNI-${suffix}`;
}

export async function executeEcommerceAction(actionType: string, params: unknown): Promise<ActionResult> {
  const typed = typeof params === "object" && params !== null ? (params as Record<string, unknown>) : {};

  switch (actionType) {
    case "GENERATE_COUPON": {
      const storeId = String(typed.storeId ?? "");
      const customerId = typed.customerId ? String(typed.customerId) : undefined;
      const discountPct = typeof typed.discountPct === "number" ? typed.discountPct : 10;
      if (!storeId) return { ok: false, message: "Missing storeId" };

      const result = await generateCoupon({
        storeId,
        code: generateCouponCode(),
        discountPct,
        customerId,
        pushToProvider: false,
      });

      if (result.ok) return { ok: true, message: `Coupon ${result.value.code} created` };
      return { ok: false, message: result.error.message };
    }

    case "REFRESH_INTEGRATION":
      return { ok: true, message: "Integration refresh requested" };

    default:
      return { ok: false, message: `Unsupported ecommerce action type: ${actionType}` };
  }
}
