import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/organizations";
import { listMediaPostsAction, syncMediaCatalogAction } from "@/modules/analytics";
import { SyncMediaForm } from "@/components/sync-media-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MediaPost } from "@/modules/analytics";

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function ContentAnalyticsPage({
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

  const { posts, error } = await listMediaPostsAction(projectId);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content performance</h1>
          <p className="text-sm text-muted-foreground">Own posts for {store.name}.</p>
        </div>
        <div className="flex items-center gap-2">
          <SyncMediaForm action={syncMediaCatalogAction} projectId={projectId} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/stores/${projectId}/analytics`}>Back to analytics</Link>
          </Button>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>}

      <div className="grid gap-6">
        {(posts ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No media posts yet. Connect Meta and sync to see content performance.
            </CardContent>
          </Card>
        ) : (
          (posts ?? []).map((post: MediaPost) => (
            <Card key={post.id}>
              <CardHeader>
                <CardTitle className="text-base">{post.mediaType}</CardTitle>
                <CardDescription>
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "Draft"}
                  {post.permalink ? (
                    <>
                      {" · "}
                      <a href={post.permalink} target="_blank" rel="noreferrer" className="underline">
                        Open on Instagram
                      </a>
                    </>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm">{post.caption || "(no caption)"}</p>
                {post.hashtags.length > 0 && (
                  <p className="mb-3 text-xs text-muted-foreground">{post.hashtags.join(" ")}</p>
                )}
                {post.latestInsight ? (
                  <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Likes</span>
                      <p>{formatNumber(post.latestInsight.likes)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Comments</span>
                      <p>{formatNumber(post.latestInsight.comments)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Shares</span>
                      <p>{formatNumber(post.latestInsight.shares)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Saves</span>
                      <p>{formatNumber(post.latestInsight.saves)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Reach</span>
                      <p>{formatNumber(post.latestInsight.reach)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Impressions</span>
                      <p>{formatNumber(post.latestInsight.impressions)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Plays</span>
                      <p>{formatNumber(post.latestInsight.plays)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Engagement rate</span>
                      <p>{post.latestInsight.engagementRate ? `${(post.latestInsight.engagementRate * 100).toFixed(2)}%` : "—"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 text-sm text-muted-foreground">No insights captured yet.</p>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/stores/${projectId}/analytics/content/${post.id}`}>Analyze why it worked</Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
