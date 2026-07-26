"use client";

import { useActionState } from "react";
import type { TicketActionState } from "@/modules/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Action = (
  prev: TicketActionState,
  formData: FormData,
) => Promise<TicketActionState>;

export function CreateTicketForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState<TicketActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="TECHNICAL">Technical</option>
          <option value="BILLING">Billing</option>
          <option value="FEATURE_REQUEST">Feature request</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={5} required />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Ticket created.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit ticket"}
      </Button>
    </form>
  );
}
