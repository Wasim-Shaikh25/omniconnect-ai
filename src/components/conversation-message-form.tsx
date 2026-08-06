"use client";

import { useActionState } from "react";
import type { ConversationActionState } from "@/modules/conversations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Action = (
  prev: ConversationActionState,
  formData: FormData,
) => Promise<ConversationActionState>;

interface ConversationMessageFormProps {
  action: Action;
  projectId: string;
  conversationId: string;
}

export function ConversationMessageForm({
  action,
  projectId,
  conversationId,
}: ConversationMessageFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="space-y-1.5">
        <Label htmlFor="content">Reply</Label>
        <Textarea
          id="content"
          name="content"
          required
          minLength={1}
          maxLength={2000}
          rows={3}
          placeholder="Type a human reply…"
          disabled={pending}
        />
      </div>
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Sending…" : "Send message"}
        </Button>
        {state?.ok && (
          <p className="text-sm text-green-600">{state.message}</p>
        )}
        {state?.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
