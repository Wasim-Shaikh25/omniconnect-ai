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

interface GenerateCouponFormProps {
  action: Action;
  projectId: string;
}

export function GenerateCouponForm({ action, projectId }: GenerateCouponFormProps) {
  const [state, formAction, pending] = useActionState<
    EcommerceActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-2">
        <Label htmlFor="code">Coupon code</Label>
        <Input
          id="code"
          name="code"
          required
          placeholder="WELCOME10"
          className="uppercase"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="discountPct">Discount %</Label>
        <Input
          id="discountPct"
          name="discountPct"
          type="number"
          min={1}
          max={100}
          defaultValue={10}
          required
        />
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="text-sm text-green-600">{state.message}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Generate coupon"}
      </Button>
    </form>
  );
}
