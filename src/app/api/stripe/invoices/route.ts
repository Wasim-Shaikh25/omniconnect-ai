import { NextResponse } from "next/server";
import { requireRole, requireVerifiedEmail, ForbiddenError, UnauthorizedError } from "@/modules/auth";
import { billingService, organizationQueries } from "@/modules/workspaces";
import { rateLimit, clientIp } from "@/shared/security/rate-limit";
import { logSystemError } from "@/shared/observability";

export async function GET(request: Request) {
  try {
    const user = await requireRole("USER");
    await requireVerifiedEmail(user);
    if (!user.userId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const limit = await rateLimit({
      key: `stripe-invoices:${user.id}:${clientIp(request.headers)}`,
      limit: 30,
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
      return NextResponse.json({ items: [] });
    }

    const items = await billingService.listInvoices(overview.stripeCustomerId);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Invoices failed";
    logSystemError("stripe.invoices", error instanceof Error ? error : new Error(message), {
      metadata: { path: "/api/stripe/invoices" },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
