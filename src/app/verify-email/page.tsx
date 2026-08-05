import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, emailVerificationService, changeEmailService, unstable_update } from "@/modules/auth";
import { auditCommands } from "@/modules/users";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let title = "Verify your email";
  let description = "Use the link we sent to your inbox to verify your account.";
  let redirectPath: string | null = null;

  if (token) {
    const request = await emailVerificationService.inspect(token);
    if (!request) {
      title = "Verification failed";
      description = "This link is invalid, expired, or has already been used.";
    } else if (request.purpose === "signup") {
      const account = await emailVerificationService.verifySignupEmail(token);
      if (!account) {
        title = "Verification failed";
        description = "This link is invalid, expired, or has already been used.";
      } else {
        title = "Email verified";
        description = "Your email has been verified. You can now sign in.";
        redirectPath = "/login";
      }
    } else if (request.purpose === "email_change") {
      const changeResult = await changeEmailService.confirm(token);
      if (!changeResult.ok) {
        title = "Email change failed";
        description = changeResult.error.message;
      } else {
        title = "Email updated";
        description = "Your email address has been updated.";
        redirectPath = "/settings/account";
        await auditCommands.create({
          organizationId: null,
          actorId: changeResult.value.id,
          actorEmail: changeResult.value.email,
          action: "USER_EMAIL_CHANGED",
          resource: "User",
          resourceId: changeResult.value.id,
          details: `Email confirmed to ${changeResult.value.email}`,
        });
        const session = await auth();
        if (session?.user) {
          try {
            await unstable_update({});
          } catch {
            // Session refresh is best-effort.
          }
        }
      }
    }
  }

  if (redirectPath) {
    redirect(redirectPath);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/login">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
