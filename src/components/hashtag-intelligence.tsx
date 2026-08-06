"use client";

import { useActionState, useState } from "react";
import { hashtagIntelligenceAction } from "@/modules/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface HashtagIntelligenceProps {
  projectId: string;
}

const LEVEL_COLOR: Record<"LOW" | "MEDIUM" | "HIGH", string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

export function HashtagIntelligence({ projectId }: HashtagIntelligenceProps) {
  const [state, formAction, pending] = useActionState(hashtagIntelligenceAction, {});
  const [query, setQuery] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formAction(formData);
  }

  return (
    <section className="mb-8 rounded-lg border p-6">
      <h2 className="mb-4 text-lg font-semibold">Hashtag intelligence</h2>
      <form onSubmit={handleSubmit} className="mb-4 flex items-end gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="hashtag-query">Search a hashtag</Label>
          <Input
            id="hashtag-query"
            name="query"
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/^#/, ""))}
            placeholder="e.g. handmadejewelry"
            required
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Analyzing…" : "Analyze"}
        </Button>
      </form>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      {state?.results && state.results.length === 0 && !state.error && (
        <p className="text-sm text-muted-foreground">No hashtag data found. Connect an Instagram account to enable live search.</p>
      )}

      {state?.results && state.results.length > 0 && (
        <ul className="space-y-3">
          {state.results.map((r) => (
            <li key={r.tag} className="rounded-md border p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-semibold">#{r.tag}</span>
                <Badge className={LEVEL_COLOR[r.competitionLevel]} variant="secondary">
                  {r.competitionLevel} competition
                </Badge>
                <span className="text-xs text-muted-foreground">relevance {r.relevanceScore}/100</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {r.postCount} posts · {r.avgLikes.toFixed(0)} avg likes · {r.avgComments.toFixed(0)} avg comments · reach est. {r.reachEstimate.toLocaleString()}
              </p>
              <p className="mt-1 text-sm">{r.recommendation}</p>
              <p className="mt-1 text-xs text-muted-foreground">{r.evidence}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
