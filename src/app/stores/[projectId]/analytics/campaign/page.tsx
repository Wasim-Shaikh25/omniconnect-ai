import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { PageHeader } from "@/components/page-header";
import { getMarketingPerformance } from "@/modules/analytics/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CampaignAnalyticsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { user, store } = access;
  if (!user.userId) notFound();

  const view = await getMarketingPerformance({ userId: user.userId, projectId });

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Campaign Performance"
          description={`Which campaigns drove growth for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Analytics", href: `/stores/${projectId}/analytics` },
            { label: "Campaign" },
          ]}
        />

        <div className="section grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        <div className="section grid gap-6 md:grid-cols-2">
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
      </div>
    </div>
  );
}