"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ActionState, OAuthProvider } from "@/modules/auth";
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
  showForgotPassword?: boolean;
  oauthProviders?: OAuthProvider[];
  oauthAction?: OAuthAction;
}

export function AuthForm({
  mode,
  action,
  oauthProviders,
  oauthAction,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );
  const isRegister = mode === "register";

  return (
    <div className="w-full space-y-4">
      <form action={formAction} className="space-y-4">
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
            placeholder="••••••••"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </div>

        {state?.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? "Please wait…"
            : isRegister
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

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
