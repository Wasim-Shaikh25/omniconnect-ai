import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { checkStoreAccess } from "@/modules/workspaces";
import { PageHeader } from "@/components/page-header";
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
    <div className="page-container">
      <div className="container max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="AI analytics dashboard"
          description={`Ask a question in plain English and get a generated dashboard for ${access.store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Analytics" },
          ]}
        />

        <div className="section">
          <QueryAnalyticsForm projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
