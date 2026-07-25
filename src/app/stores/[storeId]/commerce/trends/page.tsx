"use client";

import { use, useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TrendIdea } from "@/modules/ai";
import { generateTrendsAction } from "@/modules/ai";

export default function TrendsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const storeId = use(params).storeId;
  const [state, action, pending] = useActionState(generateTrendsAction, {});

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Social media trends & ideas</h1>
        <p className="text-sm text-muted-foreground">See what is currently working in your niche and get AI-generated content ideas.</p>
        <Link href={`/stores/${storeId}`} className="text-sm text-muted-foreground underline">Back to store</Link>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Discover trending content</CardTitle>
          <CardDescription>Enter a niche or topic to generate scroll-stopping ideas, hooks, hashtags, and audio cues.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4 md:grid-cols-5">
            <input type="hidden" name="storeId" value={storeId} />
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
              <Button type="submit" disabled={pending}>{pending ? "Analyzing…" : "Get trends"}</Button>
            </div>
          </form>
          {state.error && <p className="text-sm text-destructive mt-4">{state.error}</p>}
        </CardContent>
      </Card>

      {state.trends && state.trends.length > 0 && (
        <div className="space-y-4">
          {state.trends.map((t: TrendIdea, idx: number) => (
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
    </main>
  );
}
