"use client";

import { useActionState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TrendIdea } from "@/modules/ai";
import { generateTrendsAction, generatePostIdeasAction } from "@/modules/ai";
import type { MetaMediaItem } from "@/modules/meta";
import { searchHashtagMediaAction } from "@/modules/meta";

export default function TrendsPageClient({
  projectId,
  storeName,
}: {
  projectId: string;
  storeName: string;
}) {
  const [trendsState, trendsAction, trendsPending] = useActionState(generateTrendsAction, {});
  const [mediaState, mediaAction, mediaPending] = useActionState(searchHashtagMediaAction, {});

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Social media trends & ideas"
          description="See what is currently working in your niche and get AI-generated content ideas"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: storeName, href: `/stores/${projectId}` },
            { label: "Commerce", href: `/stores/${projectId}/commerce/catalog` },
            { label: "Trends" },
          ]}
        />

        <div className="section space-y-6 mb-10">
          <Card>
            <CardHeader>
              <CardTitle>Discover trending content</CardTitle>
              <CardDescription>Enter a niche or topic to generate scroll-stopping ideas, hooks, hashtags, and audio cues.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={trendsAction} className="grid gap-4 md:grid-cols-5">
                <input type="hidden" name="projectId" value={projectId} />
                <div className="md:col-span-2">
                  <Label htmlFor="niche">Niche / topic</Label>
                  <Input id="niche" name="niche" placeholder="e.g. sustainable fashion" required />
                </div>
                <div>
                  <Label htmlFor="format">Format</Label>
                  <select id="format" name="format" className="w-full rounded-md border bg-background px-3 py-2 text-sm" required>
                    <option value="ANY">Any</option>
                    <option value="REEL">Reel</option>
                    <option value="POST">Post</option>
                    <option value="CAROUSEL">Carousel</option>
                    <option value="STORY">Story</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="count">Ideas</Label>
                  <Input id="count" name="count" type="number" min={1} max={10} defaultValue={5} />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={trendsPending}>{trendsPending ? "Analyzing…" : "Get trends"}</Button>
                </div>
              </form>
              {trendsState.error && <p className="text-sm text-destructive mt-4">{trendsState.error}</p>}
            </CardContent>
          </Card>

          {trendsState.trends && trendsState.trends.length > 0 && (
            <div className="space-y-4">
              {trendsState.trends.map((t: TrendIdea, idx: number) => (
                <Card key={idx}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{t.title}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t.format}</p>
                      </div>
                      <span className="text-sm font-medium">Score: {t.predictedEngagementScore}/100</span>
                    </div>
                    <p className="text-sm"><span className="font-medium">Hook:</span> {t.hook}</p>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                    <p className="text-sm"><span className="font-medium">Why it works:</span> {t.whyItWorks}</p>
                    <p className="text-sm"><span className="font-medium">Audio:</span> {t.audioSuggestion}</p>
                    <p className="text-sm"><span className="font-medium">Best time:</span> {t.bestTimeToPost}</p>
                    <p className="text-sm"><span className="font-medium">CTA:</span> {t.cta}</p>
                    <p className="text-sm text-muted-foreground">{t.hashtags.join(" ")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="section space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trending posts & competitor monitor</CardTitle>
              <CardDescription>Search a hashtag or niche to see what is currently working on Instagram. Filter by creator handle to watch competitors.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={mediaAction} className="grid gap-4 md:grid-cols-5">
                <input type="hidden" name="projectId" value={projectId} />
                <div className="md:col-span-2">
                  <Label htmlFor="query">Hashtag / niche</Label>
                  <Input id="query" name="query" placeholder="e.g. sustainablefashion" required />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="ownerFilter">Filter by handle (optional)</Label>
                  <Input id="ownerFilter" name="ownerFilter" placeholder="@competitor_handle" />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={mediaPending}>{mediaPending ? "Loading…" : "Search"}</Button>
                </div>
                <Input name="limit" type="hidden" value={10} />
              </form>
              {mediaState.error && <p className="text-sm text-destructive mt-4">{mediaState.error}</p>}
            </CardContent>
          </Card>

          {mediaState.media && mediaState.media.length > 0 && (
            <div className="space-y-4">
              {mediaState.media.map((m: MetaMediaItem, idx: number) => (
                <Card key={idx}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{m.mediaType} · {m.platform}</p>
                        {m.ownerUsername && <p className="text-xs text-muted-foreground">@{m.ownerUsername}</p>}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {m.metrics.likes !== undefined && <span className="mr-3">{m.metrics.likes.toLocaleString()} likes</span>}
                        {m.metrics.comments !== undefined && <span>{m.metrics.comments.toLocaleString()} comments</span>}
                      </div>
                    </div>

                    <MediaPreview media={m} />

                    <p className="text-sm text-muted-foreground">{m.caption || "No caption"}</p>
                    {m.publishedAt && (
                      <p className="text-xs text-muted-foreground">Posted {new Date(m.publishedAt).toLocaleDateString()}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{m.hashtags.slice(0, 12).join(" ")}</p>
                    <div className="flex items-center gap-3">
                      {m.permalink && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={m.permalink} target="_blank" rel="noopener noreferrer">Open on Instagram</a>
                        </Button>
                      )}
                    </div>
                    <PostIdeaPanel media={m} projectId={projectId} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {mediaState.ok && (!mediaState.media || mediaState.media.length === 0) && (
            <p className="text-sm text-muted-foreground">No posts found. Try a different hashtag, or connect an Instagram Business account to search live Meta data.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MediaPreview({ media }: { media: MetaMediaItem }) {
  const src = media.thumbnailUrl ?? media.mediaUrl ?? null;
  if (!src) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
        No preview available
      </div>
    );
  }

  const isVideo = (media.mediaType === "VIDEO" || media.mediaType === "REEL") && media.mediaUrl;
  if (isVideo) {
    return (
      <video
        src={media.mediaUrl ?? undefined}
        poster={media.thumbnailUrl ?? undefined}
        controls
        preload="metadata"
        className="max-h-64 rounded-md"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Media preview" className="max-h-64 rounded-md" />
  );
}

function PostIdeaPanel({ media, projectId }: { media: MetaMediaItem; projectId: string }) {
  const [state, action, pending] = useActionState(generatePostIdeasAction, {});
  const caption = media.caption ?? "";
  const hashtags = media.hashtags.join(" ");

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="caption" value={caption} />
      <input type="hidden" name="hashtags" value={hashtags} />
      <input type="hidden" name="mediaType" value={media.mediaType} />
      <input type="hidden" name="ownerUsername" value={media.ownerUsername ?? ""} />
      <input type="hidden" name="likes" value={media.metrics.likes ?? 0} />
      <input type="hidden" name="comments" value={media.metrics.comments ?? 0} />
      <input type="hidden" name="plays" value={media.metrics.plays ?? 0} />
      <input type="hidden" name="reach" value={media.metrics.reach ?? 0} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>{pending ? "Thinking…" : "AI idea from this post"}</Button>
      {state.error && <p className="text-sm text-destructive mt-2">{state.error}</p>}
      {state.trends && state.trends.length > 0 && (
        <div className="mt-3 space-y-3">
          {state.trends.map((t: TrendIdea, idx: number) => (
            <div key={idx} className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-semibold">{t.title} <span className="text-xs text-muted-foreground uppercase">{t.format}</span></p>
              <p className="text-sm"><span className="font-medium">Hook:</span> {t.hook}</p>
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <p className="text-sm"><span className="font-medium">Why it works:</span> {t.whyItWorks}</p>
              <p className="text-sm text-muted-foreground">{t.hashtags.join(" ")}</p>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
