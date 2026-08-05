"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import type { ActionState, OAuthProvider } from "@/modules/auth";
import { passwordRuleDescription } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormAction = (
  prev: ActionState,
  formData: FormData,
) => Promise<ActionState>;

type OAuthAction = (formData: FormData) => Promise<void>;

interface AuthFormProps {
  mode: "login" | "register";
  action: FormAction;
  inviteToken?: string | null;
  inviteStoreId?: string | null;
  oauthProviders?: OAuthProvider[];
  oauthAction?: OAuthAction;
  turnstileSiteKey?: string;
  resendAction?: FormAction;
}

export function AuthForm({
  mode,
  action,
  inviteToken,
  inviteStoreId,
  oauthProviders,
  oauthAction,
  turnstileSiteKey,
  resendAction,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );
  const [resendState, resendFormAction] = useActionState<ActionState, FormData>(
    resendAction ?? action,
    {},
  );
  const [turnstileToken, setTurnstileToken] = useState("");
  const isRegister = mode === "register";
  const requiresMfa = state?.mfaRequired;
  const isUnverified = state?.unverified && state?.email;

  return (
    <div className="w-full space-y-4">
      <form action={formAction} className="space-y-4">
        {inviteToken && <input type="hidden" name="inviteToken" value={inviteToken} />}
        {inviteStoreId && <input type="hidden" name="storeId" value={inviteStoreId} />}
        {isRegister && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Jane Doe" autoComplete="name" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={200}
            placeholder="••••••••"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
          {isRegister && (
            <p className="text-xs text-muted-foreground" id="password-rules">
              {passwordRuleDescription()}
            </p>
          )}
        </div>

        {isRegister && (
          <>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={200}
                placeholder="••••••••"
                autoComplete="new-password"
                aria-describedby="password-rules"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+447700900123"
                autoComplete="tel"
              />
              <p className="text-xs text-muted-foreground">International format, e.g. +447700900123</p>
            </div>
            {turnstileSiteKey && (
              <div className="space-y-2">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={setTurnstileToken}
                />
                <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />
              </div>
            )}
          </>
        )}

        {!isRegister && (
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        )}

        {requiresMfa && (
          <div className="space-y-2">
            <Label htmlFor="mfaCode">Verification code</Label>
            <Input
              id="mfaCode"
              name="mfaCode"
              type="text"
              inputMode="numeric"
              required={requiresMfa}
              placeholder="123456"
              autoComplete="one-time-code"
            />
          </div>
        )}

        {state?.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
        {state?.message && !state?.error && (
          <p className="text-sm text-muted-foreground" role="status">
            {state.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? "Please wait…"
            : isRegister
              ? "Create account"
              : requiresMfa
                ? "Verify and sign in"
                : "Sign in"}
        </Button>
      </form>

      {isUnverified && resendAction && (
        <form action={resendFormAction} className="space-y-2">
          <input type="hidden" name="email" value={state.email} />
          <p className="text-sm text-muted-foreground" role="status">
            {resendState?.message ?? state.message}
          </p>
          <Button type="submit" variant="outline" className="w-full" disabled={pending}>
            Resend verification email
          </Button>
        </form>
      )}

      {oauthAction && oauthProviders && oauthProviders.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {oauthProviders.map((provider) => (
              <form key={provider.id} action={oauthAction}>
                <input type="hidden" name="provider" value={provider.id} />
                <Button type="submit" variant="outline" className="w-full">
                  {provider.name}
                </Button>
              </form>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Create one
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
