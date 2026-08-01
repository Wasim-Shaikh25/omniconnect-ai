import Link from "next/link";
import { emailVerificationService } from "@/modules/auth";
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

  if (token) {
    const result = await emailVerificationService.consume(token);
    if (result) {
      title = "Email verified";
      description = "Your email has been verified. You can now sign in.";
    } else {
      title = "Verification failed";
      description = "This link is invalid, expired, or has already been used.";
    }
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
