"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { suspendUserAction, banUserAction } from "@/modules/users";

export function UserStatusButtons({
  userId,
  suspendedAt,
  banned,
}: {
  userId: string;
  suspendedAt: Date | null;
  banned: boolean;
}) {
  const [suspendState, suspendAction, suspendPending] = useActionState<{ error?: string; ok?: boolean }, FormData>(
    suspendUserAction,
    {},
  );
  const [banState, banAction, banPending] = useActionState<{ error?: string; ok?: boolean }, FormData>(
    banUserAction,
    {},
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={suspendAction} className="inline">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="suspended" value={suspendedAt ? "false" : "true"} />
        <Button type="submit" variant="outline" size="sm" disabled={suspendPending}>
          {suspendedAt ? "Unsuspend" : "Suspend"}
        </Button>
        {suspendState?.error && (
          <p className="text-xs text-destructive" role="alert" aria-live="polite">{suspendState.error}</p>
        )}
      </form>

      <form action={banAction} className="inline">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="banned" value={banned ? "false" : "true"} />
        <Button type="submit" variant={banned ? "outline" : "destructive"} size="sm" disabled={banPending}>
          {banned ? "Unban" : "Ban"}
        </Button>
        {banState?.error && (
          <p className="text-xs text-destructive" role="alert" aria-live="polite">{banState.error}</p>
        )}
      </form>
    </div>
  );
}
