import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { getMarketingPerformance, getBestTimeToPostForStore, getContentCalendarForStore } from "@/modules/analytics/server";
import type { MarketingPerformanceView } from "@/modules/analytics";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataQualityBadge } from "@/components/data-quality-badge";

function formatCurrency(value: number, currency: string | null): string {
  return `${currency ?? "$"}${value.toFixed(2)}`;
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function GrowthAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user || !user.userId) redirect("/login");

  const overview = await organizationQueries.getOrganizationOverview(user.userId);
  const stores = overview?.stores ?? [];

  let bestWindows: Awaited<ReturnType<typeof getBestTimeToPostForStore>> = [];
  let calendar: Awaited<ReturnType<typeof getContentCalendarForStore>> = [];
  if (stores.length > 0) {
    try {
      [bestWindows, calendar] = await Promise.all([
        getBestTimeToPostForStore(stores[0].id),
        getContentCalendarForStore(stores[0].id),
      ]);
    } catch {
      bestWindows = [];
      calendar = [];
    }
  }

  const views: (MarketingPerformanceView & { storeName: string })[] = [];
  for (const store of stores) {
    try {
      const view = await getMarketingPerformance({ userId: user.userId, projectId: store.id });
      views.push({ ...view, storeName: store.name });
    } catch {
      // Skip stores that cannot load analytics.
    }
  }

  const totals = views.reduce(
    (acc, v) => ({
      revenue: acc.revenue + v.product.revenue,
      orders: acc.orders + v.product.orders,
      newCustomers: acc.newCustomers + v.product.newCustomersFromMeta,
      couponsUsed: acc.couponsUsed + v.campaign.couponsUsed,
      couponRevenue: acc.couponRevenue + v.campaign.couponRevenue,
      followers: acc.followers + v.audience.followers,
      conversations: acc.conversations + v.audience.conversations,
    }),
    { revenue: 0, orders: 0, newCustomers: 0, couponsUsed: 0, couponRevenue: 0, followers: 0, conversations: 0 },
  );

  const allTopContent = views
    .flatMap((v) => v.content.topPosts.map((p) => ({ ...p, storeName: v.storeName, projectId: v.projectId })))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const currency = views[0]?.product.currency ?? null;

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Business growth</h1>
          <p className="text-sm text-muted-foreground">
            Unified view across {views.length} connected store(s).
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </header>

      {views.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No stores connected</CardTitle>
            <CardDescription>Connect a store and Meta account to see growth analytics.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatCurrency(totals.revenue, currency)}</p>
                <p className="text-xs text-muted-foreground">{formatNumber(totals.orders)} orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New customers from Meta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{totals.newCustomers}</p>
                <p className="text-xs text-muted-foreground">7-day attribution</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Coupons used</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{totals.couponsUsed}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(totals.couponRevenue, currency)} coupon revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Followers &amp; conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{totals.followers}</p>
                <p className="text-xs text-muted-foreground">{totals.conversations} conversations</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Store breakdown</CardTitle>
              <CardDescription>Growth metrics per connected store.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {views.map((v) => (
                  <li key={v.projectId} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <DataQualityBadge quality={v.dataQuality} />
                      <span className="font-medium">{v.storeName}</span>
                    </div>
                    <div className="flex gap-4 text-muted-foreground">
                      <span>{formatCurrency(v.product.revenue, v.product.currency)}</span>
                      <span>{v.product.orders} orders</span>
                      <span>{v.product.newCustomersFromMeta} new</span>
                      <span>{v.campaign.couponsUsed} coupons</span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Top content by revenue</CardTitle>
              <CardDescription>Posts driving the most attributed orders across all stores.</CardDescription>
            </CardHeader>
            <CardContent>
              {allTopContent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attributed content yet.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {allTopContent.map((post) => (
                    <li key={`${post.projectId}-${post.id}`} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{post.caption || post.mediaType}</p>
                        <p className="text-xs text-muted-foreground">
                          {post.storeName} · {post.orders} orders
                        </p>
                      </div>
                      <span className="font-medium">{formatCurrency(post.revenue, currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Best time to post</CardTitle>
                <CardDescription>Top windows from historical engagement and order timing.</CardDescription>
              </CardHeader>
              <CardContent>
                {bestWindows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet. Publish a few posts and sync orders.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {bestWindows.map((w) => (
                      <li key={w.label} className="flex items-center justify-between py-2">
                        <span className="font-medium">{w.label}</span>
                        <span className="text-xs text-muted-foreground">score {Math.round(w.compositeScore)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI content calendar</CardTitle>
                <CardDescription>Suggested publish slots for the next 7 days.</CardDescription>
              </CardHeader>
              <CardContent>
                {calendar.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Connect Meta and add products to generate a calendar.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {calendar.map((slot) => (
                      <li key={slot.date.toISOString()} className="py-2">
                        <p className="font-medium">{slot.format} · {slot.dayOfWeek} {String(slot.hour).padStart(2, "0")}:00</p>
                        <p className="text-xs text-muted-foreground">{slot.suggestedCaption}</p>
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
