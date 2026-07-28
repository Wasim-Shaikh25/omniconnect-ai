import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCurrentUser,
  oauthProviders,
  oauthSignInAction,
  registerAction,
} from "@/modules/auth";
import {
  registerWithInviteAction,
  validateOrganizationInvite,
} from "@/modules/organizations";
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
  searchParams: Promise<{ inviteToken?: string }>;
}) {
  const { inviteToken } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.organizationId ? "/dashboard" : "/onboarding");

  let inviteEmail: string | undefined;
  if (inviteToken) {
    const invite = await validateOrganizationInvite(inviteToken);
    if (invite.ok) {
      inviteEmail = invite.value.email;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Link href="/" className="mb-2 text-sm text-muted-foreground">
            OmniConnect AI
          </Link>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>
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
            oauthProviders={oauthProviders}
            oauthAction={oauthSignInAction}
          />
        </CardContent>
      </Card>
    </main>
  );
}
