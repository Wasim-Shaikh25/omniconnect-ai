"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { RolloutGate, RolloutMode } from "@/modules/intelligence/client";
import { getRolloutGatesAction, setRolloutGateAction } from "@/modules/intelligence/client";

export function RolloutForm() {
  const [gates, dispatch, isPending] = useActionState(
    async (_prev: RolloutGate[] | null, formData: FormData) => {
      const name = formData.get("name");
      const enabled = formData.get("enabled") === "true";
      if (typeof name !== "string") return _prev ?? [];
      await setRolloutGateAction(name as RolloutMode, enabled);
      return getRolloutGatesAction() ?? [];
    },
    [] as RolloutGate[],
  );

  const gateList = gates ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {gateList.map((gate) => (
        <form
          key={gate.name}
          action={dispatch}
          className="rounded border p-4"
        >
          <input type="hidden" name="name" value={gate.name} />
          <input type="hidden" name="enabled" value={String(!gate.enabled)} />
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">{gate.name}</span>
            <span className="text-sm text-muted-foreground">{gate.enabled ? "Active" : "Inactive"}</span>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Outbound: {gate.canExecuteOutboundActions ? "Yes" : "No"} · Max risk: {gate.maxRiskTier.replace("TIER_", "Tier ")}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">Environments: {gate.allowedEnvironments.join(", ")}</p>
          <Button type="submit" size="sm" variant={gate.enabled ? "destructive" : "default"} disabled={isPending}>
            {isPending ? "Updating..." : gate.enabled ? "Disable" : "Enable"}
          </Button>
        </form>
      ))}
    </div>
  );
}
