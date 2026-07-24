import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCurrentUser,
  googleAuthEnabled,
  googleSignInAction,
  loginAction,
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
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Link href="/" className="mb-2 text-sm text-muted-foreground">
            OmniConnect AI
          </Link>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm
            mode="login"
            action={loginAction}
            googleEnabled={googleAuthEnabled}
            googleAction={googleSignInAction}
          />
        </CardContent>
      </Card>
    </main>
  );
}
