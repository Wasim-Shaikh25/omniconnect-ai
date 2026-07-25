import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { getMarketingPerformance } from "@/modules/analytics/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ContentAnalyticsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const store = overview?.stores.find((s) => s.id === storeId);
  if (!store) notFound();
  if (!user.organizationId) notFound();

  const view = await getMarketingPerformance({ organizationId: user.organizationId, storeId });

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content performance</h1>
          <p className="text-sm text-muted-foreground">Which content drives attention for {store.name}.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}/analytics`}>Back to analytics</Link>
        </Button>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Why it looks like this</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{view.content.why}</p>
            <p className="mt-2 text-sm font-medium">{view.content.nextRecommendation}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Intent breakdown</CardTitle>
            <CardDescription>Comment and mention intent signals.</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.entries(view.content.byType).length === 0 ? (
              <p className="text-sm text-muted-foreground">No intent data yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {Object.entries(view.content.byType).map(([intent, count]) => (
                  <li key={intent} className="flex items-center justify-between py-2">
                    <span className="capitalize">{intent.toLowerCase()}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Top recent mentions</CardTitle>
            <CardDescription>Recent content mentions captured for this store.</CardDescription>
          </CardHeader>
          <CardContent>
            {view.content.topPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mentions captured yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {view.content.topPosts.map((post, i) => (
                  <li key={i} className="py-3">
                    <p className="font-medium">{post.caption || "(no caption)"}</p>
                    <p className="text-xs text-muted-foreground">{post.mediaType}</p>
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
