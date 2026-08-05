"use client";

import { useActionState } from "react";
import type { MetaActionState } from "@/modules/meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (
  prev: MetaActionState,
  formData: FormData,
) => Promise<MetaActionState>;

interface MetaConnectFormProps {
  action: Action;
  storeId: string;
}

export function MetaConnectForm({ action, storeId }: MetaConnectFormProps) {
  const [state, formAction, pending] = useActionState<
    MetaActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="storeId" value={storeId} />
      <div className="space-y-2">
        <Label htmlFor="channel">Channel</Label>
        <select
          id="channel"
          name="channel"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          defaultValue="INSTAGRAM"
        >
          <option value="INSTAGRAM">Instagram Business</option>
          <option value="FACEBOOK">Facebook Page</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="accountId">Page / IG account ID</Label>
        <Input id="accountId" name="accountId" placeholder="17841400000000000" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="accessToken">Page access token (optional in dev)</Label>
        <Input
          id="accessToken"
          name="accessToken"
          type="password"
          placeholder="EAAG…"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-green-600">{state.message}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Connecting…" : "Connect Meta account"}
      </Button>
    </form>
  );
}
