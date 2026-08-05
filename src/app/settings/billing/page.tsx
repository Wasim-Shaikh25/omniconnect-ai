import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries, PLAN_FEATURES, Plan, parsePlan } from "@/modules/organizations";
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
import { env } from "@/shared/config/env";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "STORE_OWNER"].includes(user.role)) notFound();

  const params = await searchParams;
  const overview = user.userId
    ? await organizationQueries.getOrganizationOverview(user.userId)
    : null;
  const currentPlan = parsePlan(overview?.plan ?? Plan.FREE);
  const meta = PLAN_FEATURES[currentPlan];
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
        </CardContent>
      </Card>

      {!stripeConfigured && (
        <Alert className="mb-6" variant="destructive">
          <AlertTitle>Payments not configured</AlertTitle>
          <AlertDescription>
            Stripe keys are missing. Add STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY,
            STRIPE_PRICE_STARTER, and STRIPE_PRICE_PRO to your environment to enable upgrades.
          </AlertDescription>
        </Alert>
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
