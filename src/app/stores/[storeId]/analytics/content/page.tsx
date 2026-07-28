import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStoreAccess } from "@/modules/organizations";
import { getMarketingPerformance } from "@/modules/analytics/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ContentAnalyticsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const { user, store } = await requireStoreAccess(storeId);
  if (!user.organizationId) notFound();

  const view = await getMarketingPerformance({ organizationId: user.organizationId, storeId });

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content performance</h1>
          <p className="text-sm text-muted-foreground">Which content drives attention and revenue for {store.name}.</p>
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
            <CardTitle>Format breakdown</CardTitle>
            <CardDescription>Own posts by media type.</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.entries(view.content.byType).length === 0 ? (
              <p className="text-sm text-muted-foreground">No own media data yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {Object.entries(view.content.byType).map(([type, count]) => (
                  <li key={type} className="flex items-center justify-between py-2">
                    <span className="capitalize">{type.toLowerCase()}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Top posts</CardTitle>
            <CardDescription>Own posts ranked by attributed orders and engagement.</CardDescription>
          </CardHeader>
          <CardContent>
            {view.content.topPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No own posts captured yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {view.content.topPosts.map((post, i) => (
                  <li key={post.id ?? i} className="py-3">
                    <p className="font-medium">{post.caption || "(no caption)"}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="capitalize">{post.mediaType?.toLowerCase() ?? "post"}</span>
                      <span>Likes {post.likes}</span>
                      <span>Comments {post.comments}</span>
                      <span>Shares {post.shares}</span>
                      <span>Plays {post.plays}</span>
                      <span>Reach {post.reach}</span>
                      <span>Impressions {post.impressions}</span>
                      <span className="font-medium text-foreground">Orders {post.orders}</span>
                      <span className="font-medium text-foreground">Revenue {post.revenue}</span>
                    </div>
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