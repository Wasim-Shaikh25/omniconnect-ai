"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateContentRecommendationState } from "@/modules/analytics";

type Action = (_prev: CreateContentRecommendationState, formData: FormData) => Promise<CreateContentRecommendationState>;

interface CreateRecommendationFormProps {
  action: Action;
  projectId: string;
}

export function CreateRecommendationForm({ action, projectId }: CreateRecommendationFormProps) {
  const [state, formAction, pending] = useActionState<CreateContentRecommendationState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="flex-1 space-y-2">
        <Label htmlFor="topic">Topic / niche</Label>
        <Input id="topic" name="topic" placeholder="e.g. summer collection" required />
      </div>
      <div className="w-32 space-y-2">
        <Label htmlFor="type">Type</Label>
        <Input id="type" name="type" defaultValue="REEL" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create idea"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.recommendationId && <p className="text-sm text-muted-foreground">Idea created</p>}
    </form>
  );
}
