"use client";

import { useActionState } from "react";
import type { ProfileActionState } from "@/modules/users";
import { Button } from "@/components/ui/button";

type Action = (
  prev: ProfileActionState,
  formData: FormData,
) => Promise<ProfileActionState>;

interface RoleSelectFormProps {
  action: Action;
  userId: string;
  currentRole: string;
  roles: readonly string[];
}

export function RoleSelectForm({
  action,
  userId,
  currentRole,
  roles,
}: RoleSelectFormProps) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        key={currentRole}
        name="role"
        defaultValue={currentRole}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "Update"}
      </Button>
      {state?.error && (
        <span className="text-xs text-destructive" role="alert" aria-live="polite">
          {state.error}
        </span>
      )}
      {state?.ok && <span className="text-xs text-green-600">Saved</span>}
    </form>
  );
}
