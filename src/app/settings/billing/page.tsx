import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries, organizationUsage, PLAN_FEATURES, Plan, parsePlan, PlanLimits, billingService } from "@/modules/workspaces";
import type { InvoiceRecord } from "@/modules/workspaces";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PricingCards } from "@/components/pricing-cards";
import { ManageSubscriptionButton } from "./manage-subscription-button";
import { env } from "@/shared/config/env";

function formatCurrency(amount: number, currency: string): string {
  const major = amount / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(major);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

function formatLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : String(limit);
}

function limitRow(label: string, value: string, usage?: number, limit?: number | null) {
  const showBar = limit !== null && limit !== undefined && usage !== undefined && limit > 0;
  const percent = showBar ? Math.min(100, Math.round((usage / limit) * 100)) : 0;
  return (
    <li key={label} className="flex flex-col gap-1 py-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {usage !== undefined ? `${usage} / ${value}` : value}
        </span>
      </div>
      {showBar && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </li>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["SUPER_ADMIN", "USER"].includes(user.role)) notFound();

  const params = await searchParams;
  const overview = user.userId
    ? await organizationQueries.getOrganizationOverview(user.userId)
    : null;
  const currentPlan = parsePlan(overview?.plan ?? Plan.FREE);
  const meta = PLAN_FEATURES[currentPlan];
  const planLimits: PlanLimits | null = user.userId
    ? await organizationUsage.getPlanLimits(user.userId)
    : null;
  const storeCount = overview?.stores.length ?? 0;

  let invoices: InvoiceRecord[] = [];
  if (overview?.stripeCustomerId && billingService) {
    try {
      invoices = await billingService.listInvoices(overview.stripeCustomerId);
    } catch {
      invoices = [];
    }
  }

  const stripeConfigured = Boolean(
    env.STRIPE_SECRET_KEY &&
      env.STRIPE_PUBLISHABLE_KEY &&
      env.STRIPE_PRICE_STARTER &&
      env.STRIPE_PRICE_PRO,
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Subscription and plan management.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">Back to settings</Link>
        </Button>
      </header>

      {params.success && (
        <Alert className="mb-6 border-green-600/20 bg-green-600/10">
          <AlertTitle>Payment successful</AlertTitle>
          <AlertDescription>
            Your plan will update shortly once Stripe confirms the subscription.
          </AlertDescription>
        </Alert>
      )}

      {params.canceled && (
        <Alert className="mb-6" variant="destructive">
          <AlertTitle>Payment canceled</AlertTitle>
          <AlertDescription>
            You can try again whenever you are ready.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>
            {overview ? `Organization: ${overview.name}` : "No organization found"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{meta.label}</span>
            <span className="text-xl text-muted-foreground">{meta.price}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {overview?.subscriptionStatus
              ? `Subscription status: ${overview.subscriptionStatus}`
              : "No active subscription. Upgrade below to unlock more features."}
          </p>
          <ManageSubscriptionButton disabled={!overview?.stripeCustomerId || !stripeConfigured} />
        </CardContent>
      </Card>

      {planLimits && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Plan limits</CardTitle>
            <CardDescription>Your current entitlement and usage.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {limitRow("Stores / projects", formatLimit(planLimits.maxStores), storeCount, planLimits.maxStores)}
              {limitRow("AI replies / month", formatLimit(planLimits.monthlyAiReplies))}
              {limitRow("Team seats", formatLimit(planLimits.teamSeats))}
              {limitRow("Profile inspections / day", formatLimit(planLimits.maxProfileInspectionsPerDay))}
              {limitRow("Competitors", formatLimit(planLimits.maxCompetitors))}
              {limitRow("Attribution links / month", formatLimit(planLimits.maxAttributionLinksPerMonth))}
              {limitRow("Content schedules / month", formatLimit(planLimits.maxContentSchedulesPerMonth))}
              <li className="py-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Allowed models</span>
                  <span className="font-medium">
                    {planLimits.allowedModels.includes("*")
                      ? "All models"
                      : planLimits.allowedModels.join(", ") || "Default"}
                  </span>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {!stripeConfigured && (
        <Alert className="mb-6" variant="destructive">
          <AlertTitle>Payments not configured</AlertTitle>
          <AlertDescription>
            Stripe keys are missing. Add STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY,
            STRIPE_PRICE_STARTER, and STRIPE_PRICE_PRO to your environment to enable upgrades.
          </AlertDescription>
        </Alert>
      )}

      {invoices.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Invoice history</CardTitle>
            <CardDescription>Recent payments for your subscription.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {invoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between py-3 text-sm">
                  <span>
                    {invoice.number ?? "Invoice"} — {formatDate(invoice.createdAt)}
                    {invoice.periodStart && invoice.periodEnd && (
                      <span className="ml-2 text-muted-foreground">
                        ({formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)})
                      </span>
                    )}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </span>
                  {invoice.pdfUrl && (
                    <Button asChild variant="link" size="sm">
                      <a href={invoice.pdfUrl} target="_blank" rel="noreferrer">PDF</a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-4 text-xl font-semibold">Upgrade</h2>
      <PricingCards currentPlan={currentPlan} showFree={false} />

      <p className="mt-6 text-sm text-muted-foreground">
        Questions? Visit the <Link href="/help" className="underline">Help center</Link> or review
        the <Link href="/pricing" className="underline">pricing page</Link>.
      </p>
    </main>
  );
}
