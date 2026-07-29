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
  storeId: string;
  provider: string;
}

export function ConnectStoreForm({
  action,
  storeId,
  provider,
}: ConnectStoreFormProps) {
  const [state, formAction, pending] = useActionState<
    EcommerceActionState,
    FormData
  >(action, {});

  const isWooCommerce = provider === "WOOCOMMERCE";
  const isBigCommerce = provider === "BIGCOMMERCE";
  const isShopify = provider === "SHOPIFY";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="provider" value={provider} />
      {isShopify && (
        <div className="space-y-2">
          <Label htmlFor="shopDomain">Shop domain</Label>
          <Input
            id="shopDomain"
            name="shopDomain"
            placeholder="my-shop.myshopify.com"
          />
        </div>
      )}
      {isWooCommerce && (
        <div className="space-y-2">
          <Label htmlFor="shopDomain">WooCommerce base URL</Label>
          <Input
            id="shopDomain"
            name="shopDomain"
            placeholder="https://my-store.com"
          />
          <Label htmlFor="consumerKey">Consumer key</Label>
          <Input id="consumerKey" name="consumerKey" type="password" />
          <Label htmlFor="consumerSecret">Consumer secret</Label>
          <Input id="consumerSecret" name="consumerSecret" type="password" />
        </div>
      )}
      {isBigCommerce && (
        <div className="space-y-2">
          <Label htmlFor="storeHash">Store hash</Label>
          <Input id="storeHash" name="storeHash" placeholder="abc123" />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="accessToken">
          {isWooCommerce
            ? "Admin API token (optional)"
            : isBigCommerce
              ? "X-Auth-Token"
              : "Admin API access token"}
        </Label>
        <Input
          id="accessToken"
          name="accessToken"
          type="password"
          placeholder={isBigCommerce ? "Access token" : "shpat_…"}
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
