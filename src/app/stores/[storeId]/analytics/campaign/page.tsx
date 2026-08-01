import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/organizations";
import { getMarketingPerformance } from "@/modules/analytics/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CampaignAnalyticsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const access = await checkStoreAccess(storeId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { user, store } = access;
  if (!user.organizationId) notFound();

  const view = await getMarketingPerformance({ organizationId: user.organizationId, storeId });

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaign performance</h1>
          <p className="text-sm text-muted-foreground">Which campaigns drove growth for {store.name}.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}/analytics`}>Back to analytics</Link>
        </Button>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{view.campaign.activeCampaigns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Coupons generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{view.campaign.couponsGenerated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Coupons used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{view.campaign.couponsUsed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Why it looks like this</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{view.campaign.why}</p>
            <p className="mt-2 text-sm font-medium">{view.campaign.nextRecommendation}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active campaigns</CardTitle>
            <CardDescription>Coupons currently live for this store.</CardDescription>
          </CardHeader>
          <CardContent>
            {view.campaign.topCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active campaigns.</p>
            ) : (
              <ul className="divide-y text-sm">
                {view.campaign.topCampaigns.map((c, i) => (
                  <li key={i} className="flex items-center justify-between py-2">
                    <span>{c.name}</span>
                    <span className="font-medium">{c.couponsGenerated} generated</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}