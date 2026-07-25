"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MetaMediaItem } from "@/modules/meta";
import type { CompetitorAnalysis, TrendIdea } from "@/modules/ai";
import { generatePostIdeasAction } from "@/modules/ai";
import type { TrackedAccountRecord } from "@/modules/analytics";
import {
  trackCompetitorAction,
  getCompetitorMediaAction,
  analyzeCompetitorAction,
  deleteTrackedCompetitorAction,
} from "@/modules/analytics";

export default function CompetitorsPageClient({
  storeId,
  initialAccounts,
}: {
  storeId: string;
  initialAccounts: TrackedAccountRecord[];
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<TrackedAccountRecord[]>(initialAccounts);
  const [trackState, trackAction, trackPending] = useActionState(trackCompetitorAction, {});
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTrackedCompetitorAction, {});

  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  useEffect(() => {
    if (trackState.ok || deleteState.ok) {
      router.refresh();
    }
  }, [trackState.ok, deleteState.ok, router]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Competitor analysis</h1>
        <p className="text-sm text-muted-foreground">Track competitor accounts, fetch their latest posts, and get AI strategy breakdowns.</p>
        <Link href={`/stores/${storeId}`} className="text-sm text-muted-foreground underline">Back to store</Link>
      </header>

      <section className="space-y-6 mb-10">
        <Card>
          <CardHeader>
            <CardTitle>Track a competitor</CardTitle>
            <CardDescription>Add an Instagram handle to monitor and analyze.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={trackAction} className="grid gap-4 md:grid-cols-4">
              <input type="hidden" name="storeId" value={storeId} />
              <div className="md:col-span-1">
                <Label htmlFor="handle">Handle</Label>
                <Input id="handle" name="handle" placeholder="@competitor" required />
              </div>
              <div>
                <Label htmlFor="niche">Niche</Label>
                <Input id="niche" name="niche" placeholder="e.g. sustainable fashion" />
              </div>
              <div>
                <Label htmlFor="note">Note</Label>
                <Input id="note" name="note" placeholder="Why are we tracking them?" />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={trackPending}>{trackPending ? "Saving…" : "Track"}</Button>
              </div>
            </form>
            {trackState.error && <p className="text-sm text-destructive mt-4">{trackState.error}</p>}
            {trackState.ok && <p className="text-sm text-green-600 mt-4">Competitor tracked.</p>}
          </CardContent>
        </Card>

        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No competitors tracked yet. Add one above.</p>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <CompetitorCard key={account.id} account={account} storeId={storeId} onDelete={deleteAction} deletePending={deletePending} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function CompetitorCard({
  account,
  storeId,
  onDelete,
  deletePending,
}: {
  account: TrackedAccountRecord;
  storeId: string;
  onDelete: (payload: FormData) => void;
  deletePending: boolean;
}) {
  const [mediaState, mediaAction, mediaPending] = useActionState(getCompetitorMediaAction, {});
  const [analysisState, analysisAction, analysisPending] = useActionState(analyzeCompetitorAction, {});
  const media = mediaState.media ?? account.lastMedia ?? [];
  const analysis = analysisState.analysis ?? account.lastAnalysis ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>@{account.handle}</CardTitle>
            <CardDescription>{account.niche ?? "No niche set"} · {account.platform}</CardDescription>
          </div>
          <form action={onDelete}>
            <input type="hidden" name="storeId" value={storeId} />
            <input type="hidden" name="accountId" value={account.id} />
            <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>Remove</Button>
          </form>
        </div>
        {account.note && <p className="text-sm text-muted-foreground mt-2">{account.note}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <form action={mediaAction}>
            <input type="hidden" name="storeId" value={storeId} />
            <input type="hidden" name="accountId" value={account.id} />
            <Button type="submit" size="sm" disabled={mediaPending}>{mediaPending ? "Fetching…" : "Fetch latest posts"}</Button>
          </form>
          <form action={analysisAction}>
            <input type="hidden" name="storeId" value={storeId} />
            <input type="hidden" name="accountId" value={account.id} />
            <Button type="submit" variant="secondary" size="sm" disabled={analysisPending}>{analysisPending ? "Analyzing…" : "AI strategy analysis"}</Button>
          </form>
        </div>
        {mediaState.error && <p className="text-sm text-destructive">{mediaState.error}</p>}
        {analysisState.error && <p className="text-sm text-destructive">{analysisState.error}</p>}

        {analysis && (
          <AnalysisPanel analysis={analysis} />
        )}

        {media.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Latest posts</p>
            {media.map((m: MetaMediaItem, idx: number) => (
              <MediaCard key={idx} media={m} storeId={storeId} />
            ))}
          </div>
        )}

        {account.lastSyncedAt && (
          <p className="text-xs text-muted-foreground">Last synced {new Date(account.lastSyncedAt).toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisPanel({ analysis }: { analysis: CompetitorAnalysis }) {
  return (
    <div className="rounded-md border p-4 space-y-3">
      <p className="text-sm font-semibold">AI strategy analysis</p>
      <p className="text-sm text-muted-foreground">{analysis.summary}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Strengths</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Weaknesses</p>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            {analysis.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">Content patterns</p>
        <p className="text-sm text-muted-foreground">{analysis.contentPatterns.join(" · ")}</p>
      </div>
      <div>
        <p className="text-sm font-medium">Posting strategy</p>
        <p className="text-sm text-muted-foreground">{analysis.postingStrategy}</p>
      </div>
      <div>
        <p className="text-sm font-medium">Recommendations to outperform</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground">
          {analysis.recommendations.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
      <div className="grid gap-4 md:grid-cols-3 text-sm">
        <p><span className="font-medium">Hashtags:</span> {analysis.hashtags.slice(0, 10).join(" ")}</p>
        <p><span className="font-medium">Audio:</span> {analysis.audioSuggestion}</p>
        <p><span className="font-medium">Best time:</span> {analysis.bestTimeToPost}</p>
      </div>
    </div>
  );
}

function MediaCard({ media, storeId }: { media: MetaMediaItem; storeId: string }) {
  const [ideasState, ideasAction, ideasPending] = useActionState(generatePostIdeasAction, {});
  const src = media.thumbnailUrl ?? media.mediaUrl ?? null;

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{media.mediaType} · {media.platform}</p>
          {media.ownerUsername && <p className="text-xs text-muted-foreground">@{media.ownerUsername}</p>}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {media.metrics.likes !== undefined && <span className="mr-3">{media.metrics.likes.toLocaleString()} likes</span>}
          {media.metrics.comments !== undefined && <span>{media.metrics.comments.toLocaleString()} comments</span>}
        </div>
      </div>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Post preview" className="max-h-48 rounded-md" />
      )}
      <p className="text-sm text-muted-foreground">{media.caption || "No caption"}</p>
      {media.publishedAt && <p className="text-xs text-muted-foreground">Posted {new Date(media.publishedAt).toLocaleDateString()}</p>}
      <p className="text-sm text-muted-foreground">{media.hashtags.slice(0, 12).join(" ")}</p>
      <form action={ideasAction} className="mt-2">
        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="caption" value={media.caption ?? ""} />
        <input type="hidden" name="hashtags" value={media.hashtags.join(" ")} />
        <input type="hidden" name="mediaType" value={media.mediaType} />
        <input type="hidden" name="ownerUsername" value={media.ownerUsername ?? ""} />
        <input type="hidden" name="likes" value={media.metrics.likes ?? 0} />
        <input type="hidden" name="comments" value={media.metrics.comments ?? 0} />
        <input type="hidden" name="plays" value={media.metrics.plays ?? 0} />
        <input type="hidden" name="reach" value={media.metrics.reach ?? 0} />
        <Button type="submit" variant="secondary" size="sm" disabled={ideasPending}>{ideasPending ? "Thinking…" : "AI idea from this post"}</Button>
      </form>
      {ideasState.error && <p className="text-sm text-destructive">{ideasState.error}</p>}
      {ideasState.trends && ideasState.trends.length > 0 && (
        <div className="mt-2 space-y-2">
          {ideasState.trends.map((t: TrendIdea, idx: number) => (
            <div key={idx} className="rounded-md border p-2">
              <p className="text-sm font-semibold">{t.title} <span className="text-xs text-muted-foreground uppercase">{t.format}</span></p>
              <p className="text-sm text-muted-foreground">{t.hook}</p>
              <p className="text-xs text-muted-foreground">{t.hashtags.join(" ")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
