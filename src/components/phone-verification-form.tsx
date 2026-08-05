"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/modules/auth";

interface PhoneVerificationFormProps {
  phone: string | null;
  phoneVerified: Date | null;
  requestAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  verifyAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  removeAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function PhoneVerificationForm({
  phone,
  phoneVerified,
  requestAction,
  verifyAction,
  removeAction,
}: PhoneVerificationFormProps) {
  const [requestState, requestFormAction, requestPending] = useActionState(requestAction, {});
  const [verifyState, verifyFormAction, verifyPending] = useActionState(verifyAction, {});
  const [removeState, removeFormAction, removePending] = useActionState(removeAction, {});
  const [localPhone, setLocalPhone] = useState(phone ?? "");

  const isVerified = Boolean(phone && phoneVerified);

  return (
    <div className="space-y-6">
      {isVerified ? (
        <form action={removeFormAction} className="space-y-4">
          <p className="text-sm">
            Verified phone: <span className="font-medium">{phone}</span>
          </p>
          <Button type="submit" variant="destructive" disabled={removePending}>
            {removePending ? "Removing..." : "Remove phone"}
          </Button>
          {removeState?.error && <p className="text-sm text-red-600">{removeState.error}</p>}
          {removeState?.ok && <p className="text-sm text-green-600">{removeState.message}</p>}
        </form>
      ) : (
        <>
          <form action={requestFormAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
                placeholder="+447700900123"
                required
                pattern="\+[1-9]\d{7,14}"
                title="Use international format, e.g. +447700900123"
              />
              <p className="text-xs text-muted-foreground">
                Use international format starting with +.
              </p>
            </div>
            <Button type="submit" disabled={requestPending || !E164_REGEX.test(localPhone)}>
              {requestPending ? "Sending..." : "Send verification code"}
            </Button>
            {requestState?.error && <p className="text-sm text-red-600">{requestState.error}</p>}
            {requestState?.ok && <p className="text-sm text-green-600">{requestState.message}</p>}
          </form>

          <form action={verifyFormAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                required
                pattern="\d{6}"
                title="Enter the 6-digit code"
              />
            </div>
            <Button type="submit" disabled={verifyPending}>
              {verifyPending ? "Verifying..." : "Verify code"}
            </Button>
            {verifyState?.error && <p className="text-sm text-red-600">{verifyState.error}</p>}
            {verifyState?.ok && <p className="text-sm text-green-600">{verifyState.message}</p>}
          </form>
        </>
      )}
    </div>
  );
}
