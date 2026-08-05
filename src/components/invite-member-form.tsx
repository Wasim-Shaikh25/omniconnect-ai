"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InviteMemberActionState } from "@/modules/organizations";

interface StoreOption {
  id: string;
  name: string;
}

interface InviteMemberFormProps {
  action: (
    prev: InviteMemberActionState,
    formData: FormData,
  ) => Promise<InviteMemberActionState>;
  stores: StoreOption[];
  defaultEmail?: string;
}

export function InviteMemberForm({
  action,
  stores,
  defaultEmail = "",
}: InviteMemberFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");

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
          value={role}
          onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>
      <div>
        <Label htmlFor="invite-store">Store</Label>
        <select
          id="invite-store"
          name="storeId"
          required={role === "STAFF"}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">{role === "STAFF" ? "Select a store" : "No specific store"}</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
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
