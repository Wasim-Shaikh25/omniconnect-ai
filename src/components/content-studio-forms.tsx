"use client";

import { useActionState, useState } from "react";
import {
  generatePostIdeasAction,
  generateCaptionsAction,
  type GeneratePostIdeasState,
  type GenerateCaptionsState,
} from "@/modules/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Product = { id: string; title: string };

function formatScore(value: number): string {
  return `${value}/100`;
}

function IdeaResults({ state }: { state: GeneratePostIdeasState }) {
  if (state.error) {
    return <p className="text-sm text-destructive" role="alert">{state.error}</p>;
  }
  if (!state.trends || state.trends.length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      {state.evidence && (
        <div className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
          <span className="font-medium">Why these ideas:</span> {state.evidence}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.trends.map((idea, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{idea.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Format:</span> {idea.format}
              </p>
              <p>
                <span className="font-medium">Hook:</span> {idea.hook}
              </p>
              <p className="text-muted-foreground">{idea.description}</p>
              <p className="text-muted-foreground">
                <span className="font-medium">Why it works:</span> {idea.whyItWorks}
              </p>
              <p className="text-xs text-muted-foreground">
                {idea.hashtags.slice(0, 8).join(" ")}
              </p>
              <div className="flex justify-between text-xs">
                <span>Score: {formatScore(idea.predictedEngagementScore)}</span>
                <span>{idea.bestTimeToPost}</span>
              </div>
              <p className="text-xs text-muted-foreground">CTA: {idea.cta}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CaptionResults({ state }: { state: GenerateCaptionsState }) {
  if (state.error) {
    return <p className="text-sm text-destructive" role="alert">{state.error}</p>;
  }
  if (!state.captions || state.captions.length === 0) return null;

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {state.captions.map((caption, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{caption.hook}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="whitespace-pre-line text-muted-foreground">
              {caption.caption}
            </p>
            <p className="text-xs text-muted-foreground">
              {caption.hashtags.slice(0, 8).join(" ")}
            </p>
            <div className="flex justify-between text-xs">
              <span>Score: {formatScore(caption.predictedEngagementScore)}</span>
              <span>{caption.bestTimeToPost}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ContentStudioForms({
  storeId,
  products,
}: {
  storeId: string;
  products: Product[];
}) {
  const [ideaState, ideaAction, ideaPending] = useActionState<GeneratePostIdeasState, FormData>(
    generatePostIdeasAction,
    {},
  );
  const [captionState, captionAction, captionPending] = useActionState<GenerateCaptionsState, FormData>(
    generateCaptionsAction,
    {},
  );
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Generate post ideas</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={ideaAction} className="space-y-4">
            <input type="hidden" name="storeId" value={storeId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Media type
                </label>
                <select
                  name="mediaType"
                  defaultValue="REEL"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="REEL">Reel</option>
                  <option value="POST">Post</option>
                  <option value="CAROUSEL">Carousel</option>
                  <option value="STORY">Story</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Count
                </label>
                <Input
                  name="count"
                  type="number"
                  min={1}
                  max={10}
                  defaultValue={3}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Caption / context
              </label>
              <Input name="caption" placeholder="Optional post caption to inspire ideas" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Likes
                </label>
                <Input name="likes" type="number" defaultValue={0} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Comments
                </label>
                <Input name="comments" type="number" defaultValue={0} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Plays
                </label>
                <Input name="plays" type="number" defaultValue={0} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Reach
                </label>
                <Input name="reach" type="number" defaultValue={0} />
              </div>
            </div>
            <Button type="submit" disabled={ideaPending}>
              {ideaPending ? "Generating…" : "Generate ideas"}
            </Button>
          </form>
          <IdeaResults state={ideaState} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate captions</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={captionAction} className="space-y-4">
            <input type="hidden" name="storeId" value={storeId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Media type
                </label>
                <select
                  name="mediaType"
                  defaultValue="POST"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="POST">Post</option>
                  <option value="REEL">Reel</option>
                  <option value="STORY">Story</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Niche
                </label>
                <Input name="niche" placeholder="e.g. sustainable fashion" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Goal
              </label>
              <Input name="goal" placeholder="e.g. drive link clicks" />
            </div>
            {products.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Tagged products
                </label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="productTagIds"
                        value={p.id}
                        checked={selectedProducts.includes(p.id)}
                        onChange={(e) => {
                          setSelectedProducts((prev) =>
                            e.target.checked
                              ? [...prev, p.id]
                              : prev.filter((id) => id !== p.id),
                          );
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      {p.title}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button type="submit" disabled={captionPending}>
              {captionPending ? "Generating…" : "Generate captions"}
            </Button>
          </form>
          <CaptionResults state={captionState} />
        </CardContent>
      </Card>
    </div>
  );
}
