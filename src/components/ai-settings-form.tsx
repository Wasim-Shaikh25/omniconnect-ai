"use client";

import { useActionState } from "react";
import type { AIActionState } from "@/modules/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (
  prev: AIActionState,
  formData: FormData,
) => Promise<AIActionState>;

interface AIConfigurationValues {
  systemPrompt: string;
  tone: string;
  welcomeStrategy: string;
  couponStrategy: string;
  salesStrategy: string;
  escalationRules: string;
  model: string;
}

interface AISettingsFormProps {
  action: Action;
  projectId: string;
  defaultValues: AIConfigurationValues;
}

export function AISettingsForm({
  action,
  projectId,
  defaultValues,
}: AISettingsFormProps) {
  const [state, formAction, pending] = useActionState<AIActionState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          name="model"
          defaultValue={defaultValues.model}
          placeholder="gpt-4o-mini"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tone">Tone</Label>
        <Input
          id="tone"
          name="tone"
          defaultValue={defaultValues.tone}
          placeholder="friendly and concise"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System prompt</Label>
        <textarea
          id="systemPrompt"
          name="systemPrompt"
          rows={4}
          defaultValue={defaultValues.systemPrompt}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="welcomeStrategy">Welcome strategy</Label>
        <textarea
          id="welcomeStrategy"
          name="welcomeStrategy"
          rows={2}
          defaultValue={defaultValues.welcomeStrategy}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="couponStrategy">Coupon strategy</Label>
        <textarea
          id="couponStrategy"
          name="couponStrategy"
          rows={2}
          defaultValue={defaultValues.couponStrategy}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="salesStrategy">Sales strategy</Label>
        <textarea
          id="salesStrategy"
          name="salesStrategy"
          rows={2}
          defaultValue={defaultValues.salesStrategy}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="escalationRules">Escalation rules</Label>
        <textarea
          id="escalationRules"
          name="escalationRules"
          rows={2}
          defaultValue={defaultValues.escalationRules}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-green-600">{state.message}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save AI configuration"}
      </Button>
    </form>
  );
}
