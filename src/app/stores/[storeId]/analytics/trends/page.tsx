import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/organizations";
import { listTrendSnapshotsAction, searchTrendingHashtagsAction } from "@/modules/analytics";
import { SearchTrendsForm } from "@/components/search-trends-form";
import { Button } from "@/components/ui/button";
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
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trend explorer</h1>
          <p className="text-sm text-muted-foreground">Trending hashtags and audio for {store.name}.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${projectId}/analytics`}>Back to analytics</Link>
        </Button>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search trends</CardTitle>
          <CardDescription>Look up a hashtag to save its top posts to your trend history.</CardDescription>
        </CardHeader>
        <CardContent>
          <SearchTrendsForm action={searchTrendingHashtagsAction} projectId={projectId} />
        </CardContent>
      </Card>

      {error && <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>}

      <div className="grid gap-4">
        {(snapshots ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No trend snapshots yet. Search a hashtag to get started.
            </CardContent>
          </Card>
        ) : (
          (snapshots ?? []).map((snapshot: TrendSnapshot) => (
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
          ))
        )}
      </div>
    </main>
  );
}
