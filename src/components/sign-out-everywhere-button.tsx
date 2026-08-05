"use client";

import * as React from "react";
import { useActionState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ActionState } from "@/modules/auth";

type SignOutEverywhereButtonProps = {
  action(): Promise<ActionState>;
};

export function SignOutEverywhereButton({ action }: SignOutEverywhereButtonProps) {
  const [state, formAction, isPending] = useActionState(action, { ok: false });
  const [confirmed, setConfirmed] = React.useState(false);

  React.useEffect(() => {
    if (state.ok) {
      void signOut({ callbackUrl: "/login" });
    }
  }, [state]);

  if (!confirmed) {
    return (
      <Button type="button" variant="outline" onClick={() => setConfirmed(true)}>
        Sign out everywhere
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">
        This will invalidate all sessions, including other devices. Your current session will also be signed out.
      </p>
      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={isPending}>
          {isPending ? "Signing out..." : "Yes, sign out everywhere"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setConfirmed(false)} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
