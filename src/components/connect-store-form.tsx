"use client";

import { useActionState } from "react";
import type { EcommerceActionState } from "@/modules/ecommerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (
  prev: EcommerceActionState,
  formData: FormData,
) => Promise<EcommerceActionState>;

interface ConnectStoreFormProps {
  action: Action;
  projectId: string;
  provider: string;
}

export function ConnectStoreForm({
  action,
  projectId,
  provider,
}: ConnectStoreFormProps) {
  const [state, formAction, pending] = useActionState<EcommerceActionState, FormData>(
    action,
    {},
  );

  const isShopify = provider === "SHOPIFY";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="provider" value={provider} />
      <div className="space-y-2">
        <Label htmlFor="shopDomain">Shop domain</Label>
        <Input
          id="shopDomain"
          name="shopDomain"
          placeholder={
            isShopify ? "my-shop.myshopify.com" : "https://my-store.com"
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="accessToken">
          {isShopify ? "Admin API access token" : "Admin API token"}
        </Label>
        <Input
          id="accessToken"
          name="accessToken"
          type="password"
          placeholder={isShopify ? "shpat_…" : "Access token"}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Leave blank to connect with the built-in demo (Mock) provider.
      </p>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm text-green-600">{state.message}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Connecting…" : "Connect store"}
      </Button>
    </form>
  );
}
