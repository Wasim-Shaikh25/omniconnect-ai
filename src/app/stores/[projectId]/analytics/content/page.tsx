import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { PageHeader } from "@/components/page-header";
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
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Content Performance"
          description={`Own posts for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Analytics", href: `/stores/${projectId}/analytics` },
            { label: "Content" },
          ]}
          actions={<SyncMediaForm action={syncMediaCatalogAction} projectId={projectId} />}
        />

        {error && (
          <div className="section">
            <p className="text-sm text-destructive" role="alert">{error}</p>
          </div>
        )}

        <div className="section grid gap-6">
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
                  {post.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnailUrl}
                      alt={post.caption?.slice(0, 60) ?? post.mediaType}
                      className="mb-3 h-28 w-28 rounded object-cover"
                    />
                  )}
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
      </div>
    </div>
  );
}
