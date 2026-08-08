import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { getMediaPostAction, analyzeMediaAction } from "@/modules/analytics";
import { PageHeader } from "@/components/page-header";
import { AnalyzeMediaForm } from "@/components/analyze-media-form";
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
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Content analysis"
          description={`${store.name} · ${post.mediaType}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Analytics", href: `/stores/${projectId}/analytics` },
            { label: "Content", href: `/stores/${projectId}/analytics/content` },
            { label: post.mediaType },
          ]}
        />

        <div className="section">
          <Card>
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
          {post.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.thumbnailUrl}
              alt={post.caption?.slice(0, 60) ?? post.mediaType}
              className="mb-3 h-48 w-48 rounded object-cover"
            />
          )}
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
              <div>
                <span className="text-xs text-muted-foreground">Engagement rate</span>
                <p>
                  {post.latestInsight.engagementRate
                    ? `${(post.latestInsight.engagementRate * 100).toFixed(2)}%`
                    : "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No insights captured yet.</p>
          )}
          </CardContent>
          </Card>
        </div>

        <div className="section">
          <AnalyzeMediaForm action={analyzeMediaAction} projectId={projectId} mediaPostId={mediaPostId} />
        </div>
      </div>
    </div>
  );
}
