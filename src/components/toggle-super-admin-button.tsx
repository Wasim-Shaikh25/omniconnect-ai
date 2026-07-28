"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";

type Action = (
  prev: { error?: string; ok?: boolean },
  formData: FormData,
) => Promise<{ error?: string; ok?: boolean }>;

export function ToggleSuperAdminButton({
  userId,
  isSuperAdmin,
  action,
}: {
  userId: string;
  isSuperAdmin: boolean;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState<{ error?: string; ok?: boolean }, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isSuperAdmin" value={isSuperAdmin ? "false" : "true"} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {isSuperAdmin ? "Revoke" : "Grant"}
      </Button>
      {state?.error && <p className="text-sm text-destructive" role="alert" aria-live="polite">{state.error}</p>}
    </form>
  );
}
