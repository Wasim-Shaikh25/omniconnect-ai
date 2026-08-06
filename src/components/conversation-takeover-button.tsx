"use client";

import { useActionState } from "react";
import type { ConversationActionState } from "@/modules/conversations";
import { Button } from "@/components/ui/button";

type Action = (
  prev: ConversationActionState,
  formData: FormData,
) => Promise<ConversationActionState>;

interface ConversationTakeoverButtonProps {
  action: Action;
  projectId: string;
  conversationId: string;
  isHuman: boolean;
}

export function ConversationTakeoverButton({
  action,
  projectId,
  conversationId,
  isHuman,
}: ConversationTakeoverButtonProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <Button
        type="submit"
        disabled={pending}
        variant={isHuman ? "default" : "destructive"}
        size="sm"
        className="w-full sm:w-auto"
      >
        {pending ? "Updating…" : isHuman ? "Resume AI" : "Take over"}
      </Button>
      {state?.ok && (
        <p className="text-sm text-green-600">{state.message}</p>
      )}
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
