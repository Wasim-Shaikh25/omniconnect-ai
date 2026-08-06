"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type ActionState } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    requestPasswordResetAction,
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
            <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
            <CardDescription className="text-base">Enter your email and we'll send you a reset code</CardDescription>
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
                  placeholder="you@example.com"
                  autoComplete="email"
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
                    {state.message}
                  </AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Sending…" : "Send reset code"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remember your password?{" "}
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
