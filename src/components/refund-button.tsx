"use client";

import { useActionState } from "react";
import { refundInvoiceAction } from "@/modules/workspaces";
import { Button } from "@/components/ui/button";

export function RefundButton({ paymentIntentId }: { paymentIntentId: string }) {
  const [state, dispatch, isPending] = useActionState(refundInvoiceAction, undefined);

  return (
    <form action={dispatch} className="inline-flex items-center gap-2">
      <input type="hidden" name="paymentIntentId" value={paymentIntentId} />
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? "Refunding..." : "Refund"}
      </Button>
      {state?.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
      {state?.ok ? (
        <span className="text-xs text-green-600">Refunded {state.amount ? (state.amount / 100).toFixed(2) : ""}</span>
      ) : null}
    </form>
  );
}
