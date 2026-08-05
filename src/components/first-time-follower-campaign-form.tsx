"use client";

import { useActionState } from "react";
import type { UpdateCampaignInput } from "@/modules/coupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CouponsActionState } from "@/modules/coupons";

type Campaign = UpdateCampaignInput & { id: string; storeId: string };
type Action = (
  prev: CouponsActionState,
  formData: FormData,
) => Promise<CouponsActionState>;

interface FirstTimeFollowerCampaignFormProps {
  action: Action;
  storeId: string;
  campaign: Campaign;
}

export function FirstTimeFollowerCampaignForm({
  action,
  storeId,
  campaign,
}: FirstTimeFollowerCampaignFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
    message: "",
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="storeId" value={storeId} />
      <div className="space-y-2">
        <Label htmlFor="name">Campaign name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={campaign.name}
          placeholder="First-Time Follower Welcome"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discountPct">Discount %</Label>
          <Input
            id="discountPct"
            name="discountPct"
            type="number"
            min={1}
            max={100}
            defaultValue={campaign.discountPct}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="couponTtlDays">Coupon expires after (days)</Label>
          <Input
            id="couponTtlDays"
            name="couponTtlDays"
            type="number"
            min={1}
            max={365}
            defaultValue={campaign.couponTtlDays}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="messageTemplate">Message template</Label>
        <textarea
          id="messageTemplate"
          name="messageTemplate"
          rows={4}
          defaultValue={campaign.messageTemplate}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          placeholder="Hi {{username}}! Thanks for following us. Enjoy {{discount}} off with code {{code}}."
          required
        />
        <p className="text-xs text-muted-foreground">
          Use {"{{username}}"}, {"{{discount}}"}, and {"{{code}}"} as placeholders.
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={campaign.active}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="active">Active</Label>
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-green-600">{state.message}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save campaign"}
      </Button>
    </form>
  );
}
