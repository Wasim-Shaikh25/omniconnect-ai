"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InviteMemberActionState } from "@/modules/organizations";

interface InviteMemberFormProps {
  action: (
    prev: InviteMemberActionState,
    formData: FormData,
  ) => Promise<InviteMemberActionState>;
  defaultEmail?: string;
}

export function InviteMemberForm({ action, defaultEmail = "" }: InviteMemberFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          placeholder="colleague@example.com"
          required
          aria-invalid={!!state?.fieldErrors?.email}
          aria-describedby={state?.fieldErrors?.email ? "invite-email-error" : undefined}
        />
        {state?.fieldErrors?.email && (
          <p id="invite-email-error" className="mt-1 text-sm text-destructive">
            {state.fieldErrors.email.join(", ")}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="invite-role">Role</Label>
        <select
          id="invite-role"
          name="role"
          defaultValue="STAFF"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-muted-foreground">Invite sent.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Invite member"}
      </Button>
    </form>
  );
}
