import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ProfileInspectorForm } from "./ProfileInspectorForm";

export default async function ProfileInspectorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { store } = access;

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Profile Inspector"
          description={`Analyze any public Instagram profile for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Analytics", href: `/stores/${projectId}/analytics` },
            { label: "Audience", href: `/stores/${projectId}/analytics/audience` },
            { label: "Profile Inspector" },
          ]}
        />

        <div className="section">
          <ProfileInspectorForm projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
