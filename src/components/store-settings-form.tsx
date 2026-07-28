"use client";

import { useActionState } from "react";
import Link from "next/link";
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
    archivedAt: Date | null;
    deletedAt: Date | null;
  };
  providers: readonly string[];
  updateAction: (
    prev: StoreLifecycleActionState,
    formData: FormData,
  ) => Promise<StoreLifecycleActionState>;
  archiveAction: (
    prev: StoreLifecycleActionState,
    formData: FormData,
  ) => Promise<StoreLifecycleActionState>;
  restoreAction: (
    prev: StoreLifecycleActionState,
    formData: FormData,
  ) => Promise<StoreLifecycleActionState>;
  deleteAction: (
    prev: StoreLifecycleActionState,
    formData: FormData,
  ) => Promise<StoreLifecycleActionState>;
}

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export function StoreSettingsForm({
  store,
  providers,
  updateAction,
  archiveAction,
  restoreAction,
  deleteAction,
}: StoreSettingsFormProps) {
  const [updateState, updateFormAction, updatePending] = useActionState(updateAction, {});
  const [archiveState, archiveFormAction, archivePending] = useActionState(archiveAction, {});
  const [restoreState, restoreFormAction, restorePending] = useActionState(restoreAction, {});
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteAction, {});

  return (
    <div className="space-y-8">
      <form action={updateFormAction} className="space-y-4">
        <input type="hidden" name="storeId" value={store.id} />
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

      <div className="flex flex-wrap items-center gap-2 border-t pt-6">
        {store.archivedAt ? (
          <form action={restoreFormAction}>
            <input type="hidden" name="storeId" value={store.id} />
            <SubmitButton label="Restore store" pending={restorePending} />
            {restoreState?.error && <p className="text-sm text-destructive ml-2">{restoreState.error}</p>}
          </form>
        ) : (
          <form action={archiveFormAction}>
            <input type="hidden" name="storeId" value={store.id} />
            <SubmitButton label="Archive store" pending={archivePending} />
            {archiveState?.error && <p className="text-sm text-destructive ml-2">{archiveState.error}</p>}
          </form>
        )}

        <form action={deleteFormAction}>
          <input type="hidden" name="storeId" value={store.id} />
          <Button type="submit" variant="destructive" size="sm" disabled={deletePending}>
            {deletePending ? "Deleting…" : "Delete store"}
          </Button>
          {deleteState?.error && <p className="text-sm text-destructive ml-2">{deleteState.error}</p>}
        </form>

        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${store.id}`}>Back to store</Link>
        </Button>
      </div>
    </div>
  );
}
