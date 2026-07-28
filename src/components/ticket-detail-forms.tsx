"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type UpdateAction = (
  prev: { error?: string; ok?: boolean },
  formData: FormData,
) => Promise<{ error?: string; ok?: boolean }>;

type CommentAction = (
  prev: { error?: string; ok?: boolean },
  formData: FormData,
) => Promise<{ error?: string; ok?: boolean }>;

export function TicketStatusForm({
  ticketId,
  status,
  action,
}: {
  ticketId: string;
  status: string;
  action: UpdateAction;
}) {
  const [state, formAction, pending] = useActionState<{ error?: string; ok?: boolean }, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="flex gap-2">
        <select
          name="status"
          defaultValue={status}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          {["OPEN", "IN_PROGRESS", "WAITING", "CLOSED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending}>
          Update
        </Button>
      </div>
      {state?.error && <p className="text-sm text-destructive" role="alert" aria-live="polite">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Updated.</p>}
    </form>
  );
}

export function TicketCommentForm({
  ticketId,
  action,
}: {
  ticketId: string;
  action: CommentAction;
}) {
  const [state, formAction, pending] = useActionState<{ error?: string; ok?: boolean }, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Textarea name="message" placeholder="Add a reply…" required />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isInternal" className="h-4 w-4 rounded border" />
        Internal note
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Replying…" : "Reply"}
      </Button>
      {state?.error && <p className="text-sm text-destructive" role="alert" aria-live="polite">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Posted.</p>}
    </form>
  );
}
