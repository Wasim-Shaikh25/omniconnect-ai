"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { exitImpersonationAction } from "@/modules/users";
import { Button } from "@/components/ui/button";

export function ExitImpersonationButton() {
  const router = useRouter();
  const [state, dispatch, isPending] = useActionState(exitImpersonationAction, {});

  React.useEffect(() => {
    if (state?.ok) {
      router.refresh();
      router.push("/admin/users");
    }
  }, [state, router]);

  return (
    <form action={dispatch}>
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? "Exiting..." : "Exit impersonation"}
      </Button>
      {state?.error ? <p className="mt-1 text-xs text-destructive">{state.error}</p> : null}
    </form>
  );
}
