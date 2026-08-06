"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AnalyzeTrendingReelsState } from "@/modules/analytics";

type Action = (_prev: AnalyzeTrendingReelsState, formData: FormData) => Promise<AnalyzeTrendingReelsState>;

interface AnalyzeTrendingReelsFormProps {
  action: Action;
  projectId: string;
}

export function AnalyzeTrendingReelsForm({ action, projectId }: AnalyzeTrendingReelsFormProps) {
  const [state, formAction, pending] = useActionState<AnalyzeTrendingReelsState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex-1 space-y-2">
        <Label htmlFor="reel-query">Niche / topic</Label>
        <Input id="reel-query" name="query" placeholder="e.g. small business tips" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Analyzing…" : "Analyze Reels"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.snapshotId && <p className="text-sm text-muted-foreground">Snapshot saved</p>}
    </form>
  );
}
