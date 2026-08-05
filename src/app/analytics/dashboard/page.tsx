import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { checkStoreAccess } from "@/modules/workspaces";
import { QueryAnalyticsForm } from "./query-analytics-form";

export const metadata = {
  title: "Analytics dashboard",
};

export default async function AnalyticsDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const projectId = user.projectId;
  if (!projectId) redirect("/onboarding");

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">AI analytics dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ask a question in plain English and get a generated dashboard for {access.store.name}.
        </p>
      </header>

      <QueryAnalyticsForm projectId={projectId} />
    </main>
  );
}
