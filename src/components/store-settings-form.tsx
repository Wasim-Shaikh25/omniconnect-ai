"use client";

import { useActionState } from "react";
import type { StoreLifecycleActionState } from "@/modules/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StoreSettingsFormProps {
  store: {
    id: string;
    name: string;
    provider: string;
    domain: string | null;
  };
  providers: readonly string[];
  updateAction: (
    prev: StoreLifecycleActionState,
    formData: FormData,
  ) => Promise<StoreLifecycleActionState>;
}

export function StoreSettingsForm({ store, providers, updateAction }: StoreSettingsFormProps) {
  const [updateState, updateFormAction, updatePending] = useActionState(updateAction, {});

  return (
    <form action={updateFormAction} className="space-y-4">
      <input type="hidden" name="projectId" value={store.id} />
      <div className="space-y-2">
        <Label htmlFor="store-name">Store name</Label>
        <Input
          id="store-name"
          name="name"
          defaultValue={store.name}
          required
          placeholder="My Shop"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="store-provider">Provider</Label>
        <select
          id="store-provider"
          name="provider"
          defaultValue={store.provider}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="store-domain">Domain (optional)</Label>
        <Input
          id="store-domain"
          name="domain"
          defaultValue={store.domain ?? ""}
          placeholder="myshop.myshopify.com"
        />
      </div>
      {updateState?.error && <p className="text-sm text-destructive">{updateState.error}</p>}
      {updateState?.ok && <p className="text-sm text-green-600">Store updated.</p>}
      <Button type="submit" disabled={updatePending}>
        {updatePending ? "Saving…" : "Update store"}
      </Button>
    </form>
  );
}
