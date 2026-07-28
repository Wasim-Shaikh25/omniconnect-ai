import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStoreAccess } from "@/modules/organizations";
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

function formatCurrency(value: number, currency: string | null): string {
  return `${currency ?? "$"}${value.toFixed(2)}`;
}

export default async function StoreAnalyticsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const { user, store } = await requireStoreAccess(storeId);
  if (!user.organizationId) notFound();

  let view: MarketingPerformanceView | null = null;
  let error: string | null = null;
  try {
    view = await getMarketingPerformance({ organizationId: user.organizationId, storeId });
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
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
      </header>

      {error && <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>}

      {view && (
        <>
          <p className="mb-6 text-sm text-muted-foreground">{view.summary}</p>

          <div className="mb-6 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${storeId}/analytics/content`}>Content</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${storeId}/analytics/audience`}>Audience</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${storeId}/analytics/product`}>Product</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${storeId}/analytics/campaign`}>Campaign</Link>
            </Button>
          </div>

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
                <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{view.audience.conversations}</p>
                <p className="text-xs text-muted-foreground">{view.audience.messages} messages</p>
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
                  AOV {formatCurrency(view.product.orders > 0 ? view.product.revenue / view.product.orders : 0, view.product.currency)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Content engagement</CardTitle>
                <CardDescription>Mentions and comment intent signals.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mentions</span>
                    <span className="font-medium">{view.content.totalPosts}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Comments</span>
                    <span className="font-medium">
                      {Object.values(view.content.byType).reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                  {Object.entries(view.content.byType).length > 0 && (
                    <ul className="divide-y text-sm">
                      {Object.entries(view.content.byType).map(([intent, count]) => (
                        <li key={intent} className="flex items-center justify-between py-2">
                          <span className="capitalize">{intent.toLowerCase()}</span>
                          <span className="font-medium">{count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaigns &amp; coupons</CardTitle>
                <CardDescription>Active promotions and generated coupons.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active campaigns</span>
                    <span className="font-medium">{view.campaign.activeCampaigns}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coupons generated</span>
                    <span className="font-medium">{view.campaign.couponsGenerated}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coupons used</span>
                    <span className="font-medium">{view.campaign.couponsUsed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}