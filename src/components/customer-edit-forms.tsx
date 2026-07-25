"use client";

import { useActionState } from "react";
import {
  updateCustomerLifecycleAction,
  updateCustomerConsentAction,
  type CustomerActionState,
  type CustomerConsent,
  type CustomerLifecycleStage,
} from "@/modules/crm";
import { Button } from "@/components/ui/button";

function LifecycleForm({
  customerId,
  currentStage,
}: {
  customerId: string;
  currentStage: CustomerLifecycleStage;
}) {
  const [state, formAction, pending] = useActionState<CustomerActionState, FormData>(
    updateCustomerLifecycleAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="customerId" value={customerId} />
      <select
        name="lifecycleStage"
        defaultValue={currentStage}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="LEAD">Lead</option>
        <option value="PROSPECT">Prospect</option>
        <option value="CUSTOMER">Customer</option>
        <option value="CHURNED">Churned</option>
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Update lifecycle"}
      </Button>
      {state?.ok && (
        <p className="text-sm text-green-600">{state.message}</p>
      )}
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

function ConsentForm({
  customerId,
  currentConsent,
}: {
  customerId: string;
  currentConsent: CustomerConsent;
}) {
  const [state, formAction, pending] = useActionState<CustomerActionState, FormData>(
    updateCustomerConsentAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="customerId" value={customerId} />
      <select
        name="consent"
        defaultValue={currentConsent}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="PENDING">Pending</option>
        <option value="GRANTED">Granted</option>
        <option value="DECLINED">Declined</option>
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Update consent"}
      </Button>
      {state?.ok && (
        <p className="text-sm text-green-600">{state.message}</p>
      )}
      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function CustomerEditForms({
  customerId,
  lifecycleStage,
  consent,
}: {
  customerId: string;
  lifecycleStage: CustomerLifecycleStage;
  consent: CustomerConsent;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <LifecycleForm customerId={customerId} currentStage={lifecycleStage} />
      <ConsentForm customerId={customerId} currentConsent={consent} />
    </div>
  );
}
