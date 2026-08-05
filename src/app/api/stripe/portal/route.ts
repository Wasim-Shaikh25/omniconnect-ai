import { NextResponse } from "next/server";
import { requireRole, requireVerifiedEmail, ForbiddenError, UnauthorizedError } from "@/modules/auth";
import { billingService, organizationQueries } from "@/modules/workspaces";
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
      key: `stripe-portal:${user.id}:${clientIp(request.headers)}`,
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

    const overview = await organizationQueries.getOrganizationOverview(user.userId);
    if (!overview?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription to manage" },
        { status: 400 },
      );
    }

    const appUrl = env.APP_URL ?? "http://localhost:3000";
    const { url } = await billingService.createPortalSession({
      customerId: overview.stripeCustomerId,
      returnUrl: `${appUrl}/settings/billing`,
    });

    if (!url) {
      return NextResponse.json(
        { error: "Could not create portal session" },
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
    const message = error instanceof Error ? error.message : "Portal failed";
    logSystemError("stripe.portal", error instanceof Error ? error : new Error(message), {
      metadata: { path: "/api/stripe/portal" },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
