"use client";

import { useActionState } from "react";
import type { StoreActionState } from "@/modules/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (
  prev: StoreActionState,
  formData: FormData,
) => Promise<StoreActionState>;

interface CreateStoreFormProps {
  action: Action;
  providers: readonly string[];
}

export function CreateStoreForm({ action, providers }: CreateStoreFormProps) {
  const [state, formAction, pending] = useActionState<StoreActionState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="store-name">Store name</Label>
        <Input id="store-name" name="name" required placeholder="My Shop" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="store-provider">Provider</Label>
        <select
          id="store-provider"
          name="provider"
          defaultValue={providers[0]}
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
        <Input id="store-domain" name="domain" placeholder="myshop.myshopify.com" />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-green-600">Store created.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create store"}
      </Button>
    </form>
  );
}
