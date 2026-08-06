"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { impersonateUserAction } from "@/modules/users";
import { Button } from "@/components/ui/button";

interface ImpersonateUserButtonProps {
  userId: string;
}

export function ImpersonateUserButton({ userId }: ImpersonateUserButtonProps) {
  const router = useRouter();
  const [state, dispatch, isPending] = useActionState(impersonateUserAction, {});

  React.useEffect(() => {
    if (state?.ok) {
      router.refresh();
      router.push("/dashboard");
    }
  }, [state, router]);

  return (
    <form action={dispatch}>
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
        {isPending ? "Impersonating..." : "Impersonate"}
      </Button>
      {state?.error ? <p className="mt-1 text-xs text-destructive">{state.error}</p> : null}
    </form>
  );
}
