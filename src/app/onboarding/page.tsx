import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { completeOnboardingAction } from "@/modules/workspaces";
import { OnboardingForm } from "@/components/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.userId) redirect("/dashboard");

  return (
    <div className="page-container">
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create your workspace</CardTitle>
            <CardDescription>
              Start by naming your organization. You can change this later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm action={completeOnboardingAction} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
