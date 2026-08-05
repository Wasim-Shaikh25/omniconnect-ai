"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { SyncMediaCatalogState } from "@/modules/analytics";

type Action = (_prev: SyncMediaCatalogState, formData: FormData) => Promise<SyncMediaCatalogState>;

interface SyncMediaFormProps {
  action: Action;
  storeId: string;
}

export function SyncMediaForm({ action, storeId }: SyncMediaFormProps) {
  const [state, formAction, pending] = useActionState<SyncMediaCatalogState, FormData>(action, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="storeId" value={storeId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Syncing…" : "Sync media"}
      </Button>
      {state.upserted !== undefined && (
        <span className="text-xs text-muted-foreground">{state.upserted} posts synced</span>
      )}
      {state.error && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}
