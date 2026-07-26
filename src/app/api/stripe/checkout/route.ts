import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import { billingService, isPlan } from "@/modules/organizations";
import { rateLimit, clientIp } from "@/shared/security/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }
    if (!["ADMIN", "STORE_OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = await rateLimit({
      key: `stripe-checkout:${user.id ?? clientIp(request)}`,
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
        { error: "Stripe is not configured" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { plan?: string };
    if (!body.plan || !isPlan(body.plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { url } = await billingService.createCheckoutSession(
      user.organizationId,
      body.plan,
    );
    if (!url) {
      return NextResponse.json(
        { error: "Could not create checkout session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
