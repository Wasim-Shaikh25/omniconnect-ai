"use client";

import { useActionState } from "react";
import { toggleAdapterAction, validateAdapterAction, IntegrationRecord } from "@/modules/ecommerce";
import { Button } from "@/components/ui/button";

export function AdapterActions({ adapter }: { adapter: IntegrationRecord }) {
  const [toggleState, toggleDispatch, togglePending] = useActionState(toggleAdapterAction, undefined);
  const [validateState, validateDispatch, validatePending] = useActionState(validateAdapterAction, undefined);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <form action={toggleDispatch} className="inline-flex items-center gap-2">
        <input type="hidden" name="adapterId" value={adapter.id} />
        <input type="hidden" name="isActive" value={adapter.isActive ? "false" : "true"} />
        <Button type="submit" variant="outline" size="sm" disabled={togglePending}>
          {togglePending ? "Updating..." : adapter.isActive ? "Flag" : "Approve"}
        </Button>
        {toggleState?.error ? <span className="text-xs text-destructive">{toggleState.error}</span> : null}
      </form>
      <form action={validateDispatch} className="inline-flex items-center gap-2">
        <input type="hidden" name="project" value={adapter.projectId} />
        <Button type="submit" variant="outline" size="sm" disabled={validatePending}>
          {validatePending ? "Validating..." : "Validate"}
        </Button>
        {validateState?.error ? <span className="text-xs text-destructive">{validateState.error}</span> : null}
        {validateState?.valid ? <span className="text-xs text-green-600">Valid</span> : null}
      </form>
    </div>
  );
}
