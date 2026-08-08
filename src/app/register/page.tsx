import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCurrentUser,
  oauthProviders,
  oauthSignInAction,
  registerAction,
} from "@/modules/auth";
import { env } from "@/shared/config";
import {
  registerWithInviteAction,
  validateOrganizationInvite,
} from "@/modules/workspaces";
import { AuthForm } from "@/components/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ inviteToken?: string; projectId?: string }>;
}) {
  const { inviteToken, projectId } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.userId ? "/dashboard" : "/onboarding");

  let inviteEmail: string | undefined;
  if (inviteToken) {
    const invite = await validateOrganizationInvite(inviteToken);
    if (invite.ok) {
      inviteEmail = invite.value.email;
    }
  }

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
            <CardTitle className="text-3xl font-bold">Create account</CardTitle>
            <CardDescription className="text-base">
              {inviteEmail
                ? `You have been invited to join an organization. Use ${inviteEmail}.`
                : "Start your OmniConnect workspace"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm
              mode="register"
              action={inviteToken ? registerWithInviteAction : registerAction}
              inviteToken={inviteToken}
              inviteStoreId={projectId}
              oauthProviders={oauthProviders}
              oauthAction={oauthSignInAction}
              turnstileSiteKey={env.TURNSTILE_SITE_KEY}
            />

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
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
