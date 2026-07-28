"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPasswordAction, type ActionState } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const code = searchParams.get("code") ?? "";

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    {},
  );

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Link href="/" className="mb-2 text-sm text-muted-foreground">
            OmniConnect AI
          </Link>
          <CardTitle className="text-2xl">New password</CardTitle>
          <CardDescription>Enter the code and your new password</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={email}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Reset code</Label>
              <Input
                id="code"
                name="code"
                type="text"
                required
                defaultValue={code}
                placeholder="123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={200}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            )}
            {state?.message && !state?.error && (
              <p className="text-sm text-muted-foreground" role="status">
                {state.message}{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Please wait…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
