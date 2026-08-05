"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicDashboard } from "@/components/dashboard/DynamicDashboard";
import { queryAnalyticsAction, type QueryAnalyticsState } from "@/modules/analytics";
import { DashboardExportToolbar } from "./_components/dashboard-export-toolbar";

interface QueryAnalyticsFormProps {
  projectId: string;
}

export function QueryAnalyticsForm({ projectId }: QueryAnalyticsFormProps) {
  const [state, submitAction, isPending] = useActionState<QueryAnalyticsState, FormData>(
    queryAnalyticsAction,
    {},
  );
  const dashboardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ask a question</CardTitle>
          <CardDescription>
            Try “top posts this week”, “revenue trend this month”, or “compare orders to last month”.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submitAction} className="flex flex-col gap-4 sm:flex-row">
            <input type="hidden" name="projectId" value={projectId} />
            <div className="flex-1">
              <Label htmlFor="question" className="sr-only">
                Question
              </Label>
              <Input
                id="question"
                name="question"
                placeholder="e.g. top performing posts"
                required
                maxLength={500}
                disabled={isPending}
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Generating..." : "Generate dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      {state.schema && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Operation: <span className="font-medium text-foreground">{state.operation}</span>
            </p>
            <DashboardExportToolbar projectId={projectId} schema={state.schema} targetRef={dashboardRef} />
          </div>
          <div ref={dashboardRef} className="rounded-lg border bg-card p-4">
            <DynamicDashboard schema={state.schema} />
          </div>
        </div>
      )}
    </div>
  );
}
