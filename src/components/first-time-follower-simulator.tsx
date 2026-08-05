"use client";

import { useActionState } from "react";
import type { CouponsActionState } from "@/modules/coupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (
  prev: CouponsActionState,
  formData: FormData,
) => Promise<CouponsActionState>;

interface FirstTimeFollowerSimulatorProps {
  action: Action;
  projectId: string;
}

export function FirstTimeFollowerSimulator({
  action,
  projectId,
}: FirstTimeFollowerSimulatorProps) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
    message: "",
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="channel" value="INSTAGRAM" />
      <div className="space-y-2">
        <Label htmlFor="username">Instagram username</Label>
        <Input
          id="username"
          name="username"
          placeholder="jane_doe"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="externalUserId">External user ID</Label>
        <Input
          id="externalUserId"
          name="externalUserId"
          placeholder="1234567890"
          required
        />
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
        {pending ? "Simulating…" : "Simulate new follower"}
      </Button>
    </form>
  );
}
