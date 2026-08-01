"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordRuleDescription } from "@/modules/auth";
import type { ActionState } from "@/modules/auth";

interface AccountSecurityFormsProps {
  changePasswordAction: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
  requestEmailChangeAction: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function AccountSecurityForms({
  changePasswordAction,
  requestEmailChangeAction,
}: AccountSecurityFormsProps) {
  const [passwordState, passwordFormAction, passwordPending] = useActionState<ActionState, FormData>(
    changePasswordAction,
    {},
  );
  const [emailState, emailFormAction, emailPending] = useActionState<ActionState, FormData>(
    requestEmailChangeAction,
    {},
  );

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Change password</h2>
        <form action={passwordFormAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              maxLength={200}
              autoComplete="new-password"
              aria-describedby="new-password-rules"
            />
            <p id="new-password-rules" className="text-xs text-muted-foreground">
              {passwordRuleDescription()}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirm new password</Label>
            <Input
              id="confirmNewPassword"
              name="confirmNewPassword"
              type="password"
              required
              minLength={8}
              maxLength={200}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={passwordPending}>
            Update password
          </Button>
          {passwordState?.error && (
            <p className="text-sm text-red-600" role="alert">{passwordState.error}</p>
          )}
          {passwordState?.ok && (
            <p className="text-sm text-green-600" role="status">{passwordState.message}</p>
          )}
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Change email</h2>
        <form action={emailFormAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newEmail">New email</Label>
            <Input id="newEmail" name="newEmail" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewEmail">Confirm new email</Label>
            <Input id="confirmNewEmail" name="confirmNewEmail" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentPasswordEmail">Current password</Label>
            <Input
              id="currentPasswordEmail"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={emailPending}>
            Request email change
          </Button>
          {emailState?.error && (
            <p className="text-sm text-red-600" role="alert">{emailState.error}</p>
          )}
          {emailState?.ok && (
            <p className="text-sm text-green-600" role="status">{emailState.message}</p>
          )}
        </form>
      </section>
    </div>
  );
}
