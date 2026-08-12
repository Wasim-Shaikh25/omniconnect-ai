import { NextResponse } from "next/server";
import { requireRole, requireVerifiedEmail, ForbiddenError, UnauthorizedError } from "@/modules/auth";
import { billingService, isPlan, validateSaaSCoupon } from "@/modules/workspaces";
import { env } from "@/shared/config";
import { rateLimit, clientIp } from "@/shared/security/rate-limit";
import { logSystemError } from "@/shared/observability";

export async function POST(request: Request) {
  try {
    const user = await requireRole("USER");
    await requireVerifiedEmail(user);
    if (!user.userId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const limit = await rateLimit({
      key: `razorpay-checkout:${user.id}:${clientIp(request.headers)}`,
      limit: 10,
      windowMs: 60_000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
    if (!billingService) {
      return NextResponse.json(
        { error: "Razorpay is not configured" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { plan?: string; couponCode?: string };
    if (!body.plan || !isPlan(body.plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    let couponCode: string | undefined;
    if (body.couponCode) {
      couponCode = body.couponCode.trim().toUpperCase();
      const couponResult = await validateSaaSCoupon(couponCode, body.plan);
      if (!couponResult.ok) {
        return NextResponse.json({ error: couponResult.error.message }, { status: 400 });
      }
    }

    const appUrl = env.APP_URL ?? "http://localhost:3000";
    const { url } = await billingService.createCheckoutSession({
      userId: user.userId,
      plan: body.plan,
      successUrl: `${appUrl}/settings/billing?success=1`,
      cancelUrl: `${appUrl}/settings/billing?canceled=1`,
      couponCode,
    });
    if (!url) {
      return NextResponse.json(
        { error: "Could not create checkout session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Checkout failed";
    logSystemError("razorpay.checkout", error instanceof Error ? error : new Error(message), {
      metadata: { path: "/api/razorpay/checkout" },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
