"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { GenerateReportState } from "@/modules/analytics";

type Action = (_prev: GenerateReportState, formData: FormData) => Promise<GenerateReportState>;

interface GenerateReportFormProps {
  action: Action;
  storeId: string;
}

export function GenerateReportForm({ action, storeId }: GenerateReportFormProps) {
  const [state, formAction, pending] = useActionState<GenerateReportState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="storeId" value={storeId} />
      <div className="flex-1 space-y-2">
        <Label htmlFor="period">Period</Label>
        <select
          id="period"
          name="period"
          defaultValue="WEEKLY"
          className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Generating…" : "Generate report"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.reportId && <p className="text-sm text-muted-foreground">Report created</p>}
    </form>
  );
}
