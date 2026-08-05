"use client";

import { useActionState } from "react";
import type { EcommerceActionState } from "@/modules/ecommerce";
import { Button } from "@/components/ui/button";

type Action = (
  prev: EcommerceActionState,
  formData: FormData,
) => Promise<EcommerceActionState>;

interface SyncProductsButtonProps {
  action: Action;
  projectId: string;
}

export function SyncProductsButton({ action, projectId }: SyncProductsButtonProps) {
  const [state, formAction, pending] = useActionState<
    EcommerceActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Syncing…" : "Sync products"}
      </Button>
      {state?.error && (
        <span className="text-sm text-destructive" role="alert">
          {state.error}
        </span>
      )}
      {state?.ok && (
        <span className="text-sm text-green-600">{state.message}</span>
      )}
    </form>
  );
}
