import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCurrentUser,
  oauthProviders,
  oauthSignInAction,
  loginAction,
  resendVerificationEmailAction,
} from "@/modules/auth";
import { AuthForm } from "@/components/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.userId ? "/dashboard" : "/onboarding");

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
            <CardTitle className="text-3xl font-bold">Welcome back</CardTitle>
            <CardDescription className="text-base">Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm
              mode="login"
              action={loginAction}
              oauthProviders={oauthProviders}
              oauthAction={oauthSignInAction}
              resendAction={resendVerificationEmailAction}
            />

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary font-medium hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
          {" "}and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
