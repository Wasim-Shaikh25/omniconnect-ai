"use client";

import * as React from "react";
import { useActionState } from "react";
import { updatePlanConfigAction, PlanConfigRecord, PlanLimits } from "@/modules/workspaces";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PlanConfigFormProps {
  config: PlanConfigRecord;
}

const limitFields: { key: keyof PlanLimits; label: string }[] = [
  { key: "maxWorkspaces", label: "Max workspaces" },
  { key: "maxProjects", label: "Max projects" },
  { key: "monthlyAiReplies", label: "AI replies / month" },
  { key: "maxProfileInspectionsPerDay", label: "Profile inspections / day" },
  { key: "teamSeats", label: "Team seats" },
  { key: "maxStores", label: "Max stores" },
  { key: "maxCompetitors", label: "Max competitors" },
  { key: "maxAttributionLinksPerMonth", label: "Attribution links / month" },
  { key: "maxContentSchedulesPerMonth", label: "Content schedules / month" },
];

function formatLimit(value: number | null | string[] | undefined): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function PlanConfigForm({ config }: PlanConfigFormProps) {
  const [state, dispatch, isPending] = useActionState(updatePlanConfigAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.plan}</CardTitle>
        <CardDescription>
          {config.isDefault ? "Falls back to built-in defaults" : "Custom limits"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={dispatch} className="space-y-4">
          <input type="hidden" name="plan" value={config.plan} />
          {limitFields.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`${config.plan}-${key}`}>{label}</Label>
              <Input
                id={`${config.plan}-${key}`}
                name={key}
                type="number"
                defaultValue={formatLimit(config[key] as number | null | undefined)}
                placeholder="Unlimited"
              />
              <p className="text-xs text-muted-foreground">Leave blank or 0 for unlimited.</p>
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor={`${config.plan}-allowedModels`}>Allowed models</Label>
            <Input
              id={`${config.plan}-allowedModels`}
              name="allowedModels"
              defaultValue={formatLimit(config.allowedModels)}
              placeholder="openai/gpt-4o-mini, *"
            />
            <p className="text-xs text-muted-foreground">Comma-separated. Use * for all.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${config.plan}-priceMonthlyCents`}>Monthly price (cents)</Label>
            <Input
              id={`${config.plan}-priceMonthlyCents`}
              name="priceMonthlyCents"
              type="number"
              defaultValue={String(config.priceMonthlyCents ?? 0)}
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Saving..." : "Save plan"}
          </Button>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state?.ok ? <p className="text-sm text-green-600">{state.message}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
