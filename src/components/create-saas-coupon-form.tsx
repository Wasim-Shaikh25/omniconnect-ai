"use client";

import { useActionState } from "react";
import type { CouponActionState } from "@/modules/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (
  prev: CouponActionState,
  formData: FormData,
) => Promise<CouponActionState>;

export function CreateSaaSCouponForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState<CouponActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" placeholder="WELCOME20" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label">Label (optional)</Label>
          <Input id="label" name="label" placeholder="Launch promotion" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discountPct">Discount % (1–100)</Label>
          <Input id="discountPct" name="discountPct" type="number" min={1} max={100} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxUses">Max uses (optional)</Label>
          <Input id="maxUses" name="maxUses" type="number" min={1} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expires at (optional)</Label>
          <Input id="expiresAt" name="expiresAt" type="datetime-local" />
        </div>
        <div className="space-y-2">
          <Label>Applies to plans</Label>
          <div className="flex gap-4">
            {["FREE", "STARTER", "PRO"].map((plan) => (
              <label key={plan} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="appliesTo"
                  value={plan}
                  className="h-4 w-4 rounded border"
                />
                {plan}
              </label>
            ))}
          </div>
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive" role="alert" aria-live="polite">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Coupon {state.coupon?.code} created.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create coupon"}
      </Button>
    </form>
  );
}
