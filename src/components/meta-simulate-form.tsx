"use client";

import { useActionState } from "react";
import type { MetaActionState } from "@/modules/meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (
  prev: MetaActionState,
  formData: FormData,
) => Promise<MetaActionState>;

interface MetaSimulateFormProps {
  action: Action;
  projectId: string;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm";

export function MetaSimulateForm({ action, projectId }: MetaSimulateFormProps) {
  const [state, formAction, pending] = useActionState<
    MetaActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="sim-kind">Event</Label>
          <select id="sim-kind" name="kind" className={selectClass} defaultValue="message">
            <option value="message">Message</option>
            <option value="follow">Follow</option>
            <option value="comment">Comment</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sim-channel">Channel</Label>
          <select
            id="sim-channel"
            name="channel"
            className={selectClass}
            defaultValue="INSTAGRAM"
          >
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sim-user">External user ID</Label>
        <Input id="sim-user" name="externalUserId" placeholder="ig-user-123" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sim-username">Username (optional)</Label>
        <Input id="sim-username" name="username" placeholder="john_smith" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sim-text">Message / comment text</Label>
        <Input id="sim-text" name="text" placeholder="Hi, do you ship overseas?" />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-green-600">{state.message}</p>}

      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending…" : "Simulate inbound event"}
      </Button>
    </form>
  );
}
