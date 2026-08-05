import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { type MarketingPerformanceView } from "@/modules/analytics";
import { getMarketingPerformance } from "@/modules/analytics/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataQualityBadge } from "@/components/data-quality-badge";

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number, currency: string | null): string {
  return `${currency ?? "$"}${value.toFixed(2)}`;
}

export default async function StoreAnalyticsPage({
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

  let view: MarketingPerformanceView | null = null;
  let error: string | null = null;
  try {
    view = await getMarketingPerformance({ userId: user.userId, projectId });
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load marketing performance";
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Marketing analytics</h1>
          <p className="text-sm text-muted-foreground">Snapshot for {store.name}.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${projectId}`}>Back to store</Link>
        </Button>
      </header>

      {error && <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>}

      {view && (
        <>
          <div className="mb-2 flex items-center gap-2">
            <DataQualityBadge quality={view.dataQuality} />
            <span className="text-xs text-muted-foreground">
              {view.dataQuality === "simulated"
                ? "Social metrics are estimated until a Meta account is connected."
                : view.dataQuality === "partial"
                  ? "Some real-time data sources are not connected yet."
                  : "Metrics are based on connected data sources."}
            </span>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">{view.summary}</p>

          <div className="mb-6 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${projectId}/analytics/content`}>Content</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${projectId}/analytics/audience`}>Audience</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${projectId}/analytics/product`}>Product</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${projectId}/analytics/campaign`}>Campaign</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${projectId}/analytics/competitors`}>Competitors</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${projectId}/analytics/mentions`}>Mentions</Link>
            </Button>
          </div>

          {view.audience.pageInsights && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Connected Meta account</CardTitle>
                <CardDescription>
                  @{view.audience.pageInsights.username ?? "unknown"} · {formatNumber(view.audience.pageInsights.mediaCount)} media
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { label: "Followers", value: view.audience.pageInsights.followers },
                    { label: "Impressions", value: view.audience.pageInsights.impressions },
                    { label: "Reach", value: view.audience.pageInsights.reach },
                    { label: "Profile views", value: view.audience.pageInsights.profileViews },
                    { label: "Media count", value: view.audience.pageInsights.mediaCount },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="text-xl font-semibold">{formatNumber(metric.value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>AI marketing explanation</CardTitle>
              <CardDescription>Why these numbers look this way and what to do next.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{view.explanation}</p>
            </CardContent>
          </Card>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Followers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{view.audience.followers}</p>
                <p className="text-xs text-muted-foreground">+{view.audience.newFollowersThisWeek} this week</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New customers from Meta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{view.product.newCustomersFromMeta}</p>
                <p className="text-xs text-muted-foreground">within 7-day attribution window</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{view.product.orders}</p>
                <p className="text-xs text-muted-foreground">{view.product.totalProducts} products</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatCurrency(view.product.revenue, view.product.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  AOV {formatCurrency(view.product.aov ?? 0, view.product.currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Coupons used</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{view.campaign.couponsUsed}</p>
                <p className="text-xs text-muted-foreground">
                  {view.campaign.couponConversionRate
                    ? `${view.campaign.couponConversionRate.toFixed(1)}% of generated`
                    : `${view.campaign.couponsGenerated} generated`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Coupon revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatCurrency(view.campaign.couponRevenue, view.product.currency)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{view.audience.conversations}</p>
                <p className="text-xs text-muted-foreground">{view.audience.messages} messages</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Post-attributed revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatCurrency(view.content.topPosts.reduce((sum, p) => sum + p.revenue, 0), view.product.currency)}
                </p>
                <p className="text-xs text-muted-foreground">orders linked to a Meta post</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Content attribution</CardTitle>
                <CardDescription>Top posts by attributed orders and revenue.</CardDescription>
              </CardHeader>
              <CardContent>
                {view.content.topPosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No content captured yet.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {view.content.topPosts.map((post) => (
                      <li key={post.id} className="flex items-center justify-between py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{post.caption || post.mediaType}</p>
                          <p className="text-xs text-muted-foreground">
                            {post.orders} orders · {formatCurrency(post.revenue, view.product.currency)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top coupons</CardTitle>
                <CardDescription>Coupons by usage and attributed revenue.</CardDescription>
              </CardHeader>
              <CardContent>
                {view.campaign.topCampaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No coupons used yet.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {view.campaign.topCampaigns.map((campaign) => (
                      <li key={campaign.name} className="flex items-center justify-between py-2">
                        <span className="font-medium">{campaign.name}</span>
                        <span className="text-muted-foreground">
                          {campaign.couponsUsed} used · {formatCurrency(campaign.revenue, view.product.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}