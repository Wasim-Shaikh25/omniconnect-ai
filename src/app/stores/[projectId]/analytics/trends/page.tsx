import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { listTrendSnapshotsAction, searchTrendingHashtagsAction, analyzeTrendingReelsAction } from "@/modules/analytics";
import { PageHeader } from "@/components/page-header";
import { SearchTrendsForm } from "@/components/search-trends-form";
import { AnalyzeTrendingReelsForm } from "@/components/analyze-trending-reels-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrendSnapshot } from "@/modules/analytics";

export default async function TrendsAnalyticsPage({
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

  const { snapshots, error } = await listTrendSnapshotsAction(projectId);

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Trend Explorer"
          description={`Trending hashtags and audio for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: "Analytics", href: `/stores/${projectId}/analytics` },
            { label: "Trends" },
          ]}
        />

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Search Trends</CardTitle>
              <CardDescription>Look up a hashtag to save its top posts to your trend history.</CardDescription>
            </CardHeader>
            <CardContent>
              <SearchTrendsForm action={searchTrendingHashtagsAction} projectId={projectId} />
            </CardContent>
          </Card>
        </div>

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Trending Reels</CardTitle>
              <CardDescription>Analyze your recent Reels to detect niche patterns and get AI recommendations.</CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyzeTrendingReelsForm action={analyzeTrendingReelsAction} projectId={projectId} />
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="section">
            <p className="text-sm text-destructive" role="alert">{error}</p>
          </div>
        )}

        <div className="section">
          {(snapshots ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No trend snapshots yet. Search a hashtag to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {(snapshots ?? []).map((snapshot: TrendSnapshot) => (
                <Card key={snapshot.id}>
                  <CardHeader>
                    <CardTitle className="text-base capitalize">{snapshot.type.toLowerCase()}</CardTitle>
                    <CardDescription>
                      {snapshot.query} · {new Date(snapshot.fetchedAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
                      {JSON.stringify(snapshot.data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
