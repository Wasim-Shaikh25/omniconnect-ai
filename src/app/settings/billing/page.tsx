import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries, organizationUsage, PLAN_FEATURES, Plan, parsePlan, PlanLimits, billingService } from "@/modules/workspaces";
import type { InvoiceRecord } from "@/modules/workspaces";
import { PageHeader } from "@/components/page-header";
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
import { CheckCircle2, AlertTriangle } from "lucide-react";

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
  if (overview?.paymentCustomerId && billingService) {
    try {
      invoices = await billingService.listInvoices(overview.paymentCustomerId);
    } catch {
      invoices = [];
    }
  }

  const razorpayConfigured = Boolean(
    env.RAZORPAY_KEY_ID &&
      env.RAZORPAY_KEY_SECRET &&
      env.RAZORPAY_PLAN_PRO &&
      env.RAZORPAY_PLAN_BUSINESS,
  );

  return (
    <div className="page-container">
      <div className="container max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Billing"
          description="Subscription and plan management"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Settings", href: "/settings" },
            { label: "Billing" },
          ]}
        />

        {params.success && (
          <Alert className="section mb-6 border-green-600/20 bg-green-600/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Payment successful</AlertTitle>
            <AlertDescription className="text-green-600">
              Your plan will update shortly once Razorpay confirms the subscription.
            </AlertDescription>
          </Alert>
        )}

        {params.canceled && (
          <Alert className="section mb-6 border-red-600/20 bg-red-600/10">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-600">Payment canceled</AlertTitle>
            <AlertDescription className="text-red-600">
              You can try again whenever you are ready.
            </AlertDescription>
          </Alert>
        )}

        <div className="section space-y-6">
        <Card>
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
          <ManageSubscriptionButton disabled={!overview?.paymentCustomerId || !razorpayConfigured} />
        </CardContent>
      </Card>

      {planLimits && (
        <Card>
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

      {!razorpayConfigured && (
        <Alert variant="destructive">
          <AlertTitle>Payments not configured</AlertTitle>
          <AlertDescription>
            Razorpay keys are missing. Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
            RAZORPAY_PLAN_PRO, and RAZORPAY_PLAN_BUSINESS to your environment to enable upgrades.
          </AlertDescription>
        </Alert>
      )}

      {invoices.length > 0 && (
        <Card>
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

        </div>

        <div className="section">
          <h2 className="section-title">Upgrade your plan</h2>
          <PricingCards currentPlan={currentPlan} showFree={false} />
        </div>

        <p className="text-sm text-muted-foreground">
          Questions? Visit the <Link href="/help" className="underline">Help center</Link> or review
          the <Link href="/pricing" className="underline">pricing page</Link>.
        </p>
      </div>
    </div>
  );
}
