"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ProfileActionState } from "@/modules/users";

interface StoreOption {
  id: string;
  name: string;
}

interface StoreSelectFormProps {
  action: (
    prev: ProfileActionState,
    formData: FormData,
  ) => Promise<ProfileActionState>;
  userId: string;
  stores: StoreOption[];
  currentStoreId?: string | null;
}

export function StoreSelectForm({
  action,
  userId,
  stores,
  currentStoreId,
}: StoreSelectFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="projectId"
        defaultValue={currentStoreId ?? ""}
        className="rounded-md border bg-background px-2 py-1 text-sm"
      >
        <option value="">No store</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Update store"}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Saved</p>}
    </form>
  );
}
