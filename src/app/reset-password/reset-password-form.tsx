"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPasswordAction, type ActionState } from "@/modules/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    {},
  );

  return (
    <div className="page-container flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-surface-elevation/30">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block font-bold text-lg text-foreground mb-6 hover:text-primary transition-colors">
            OmniConnect AI
          </Link>
        </div>

        <Card className="card-base shadow-lg">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
            <CardDescription className="text-base">
              Enter the reset code from your email and your new password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="form-label">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={email}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code" className="form-label">Reset code</Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  required
                  placeholder="123456"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="form-label">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={200}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={pending}
                />
              </div>
              {state?.error && (
                <Alert variant="destructive" className="border-red-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {state.error}
                  </AlertDescription>
                </Alert>
              )}
              {state?.message && !state?.error && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    {state.message}{" "}
                    <Link href="/login" className="font-medium hover:underline">
                      Sign in
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Updating…" : "Update password"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary font-medium hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
