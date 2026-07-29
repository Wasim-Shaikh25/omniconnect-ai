"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyzeMediaState } from "@/modules/analytics";

type Action = (_prev: AnalyzeMediaState, formData: FormData) => Promise<AnalyzeMediaState>;

interface AnalyzeMediaFormProps {
  action: Action;
  storeId: string;
  mediaPostId: string;
}

export function AnalyzeMediaForm({ action, storeId, mediaPostId }: AnalyzeMediaFormProps) {
  const [state, formAction, pending] = useActionState<AnalyzeMediaState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="mediaPostId" value={mediaPostId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Analyzing…" : "AI: Why it worked"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      {state.analysis && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Why it worked</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{state.analysis.whyItWorked}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Slide-by-slide storyboard</CardTitle>
              <CardDescription>Reusable creative breakdown.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-3 pl-5 text-sm">
                {state.analysis.slideBySlideStoryboard.map((slide) => (
                  <li key={slide.slide}>
                    <p className="font-medium">{slide.visual}</p>
                    <p className="text-muted-foreground">{slide.caption}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suggested improvements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {state.analysis.suggestedImprovements.map((improvement, i) => (
                  <li key={i}>{improvement}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </form>
  );
}
