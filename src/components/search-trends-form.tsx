"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SearchTrendingHashtagsState } from "@/modules/analytics";

type Action = (_prev: SearchTrendingHashtagsState, formData: FormData) => Promise<SearchTrendingHashtagsState>;

interface SearchTrendsFormProps {
  action: Action;
  projectId: string;
}

export function SearchTrendsForm({ action, projectId }: SearchTrendsFormProps) {
  const [state, formAction, pending] = useActionState<SearchTrendingHashtagsState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex-1 space-y-2">
        <Label htmlFor="query">Hashtag / trend</Label>
        <Input id="query" name="query" placeholder="e.g. smallbusiness" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Searching…" : "Search"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.snapshotId && <p className="text-sm text-muted-foreground">Snapshot saved</p>}
    </form>
  );
}
