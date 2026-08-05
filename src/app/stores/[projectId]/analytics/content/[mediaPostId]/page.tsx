import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { getMediaPostAction, analyzeMediaAction } from "@/modules/analytics";
import { AnalyzeMediaForm } from "@/components/analyze-media-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function MediaPostDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; mediaPostId: string }>;
}) {
  const { projectId, mediaPostId } = await params;

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { user, store } = access;
  if (!user.userId) notFound();

  const { post, error } = await getMediaPostAction(mediaPostId);
  if (error || !post) notFound();

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content analysis</h1>
          <p className="text-sm text-muted-foreground">{store.name} · {post.mediaType}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${projectId}/analytics/content`}>Back to content</Link>
        </Button>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{post.mediaType}</CardTitle>
          <CardDescription>
            {post.publishedAt ? new Date(post.publishedAt).toLocaleString() : "Draft"}
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
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[
                { label: "Likes", value: post.latestInsight.likes },
                { label: "Comments", value: post.latestInsight.comments },
                { label: "Shares", value: post.latestInsight.shares },
                { label: "Saves", value: post.latestInsight.saves },
                { label: "Reach", value: post.latestInsight.reach },
                { label: "Impressions", value: post.latestInsight.impressions },
                { label: "Plays", value: post.latestInsight.plays },
                { label: "Views", value: post.latestInsight.views },
              ].map((metric) => (
                <div key={metric.label}>
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                  <p>{formatNumber(metric.value)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No insights captured yet.</p>
          )}
        </CardContent>
      </Card>

      <AnalyzeMediaForm action={analyzeMediaAction} projectId={projectId} mediaPostId={mediaPostId} />
    </main>
  );
}
