import { notFound, redirect } from "next/navigation";
import { ECOMMERCE_PROVIDERS, checkStoreAccess, updateStoreAction } from "@/modules/workspaces";
import { PageHeader } from "@/components/page-header";
import { StoreSettingsForm } from "@/components/store-settings-form";
import { MetaConnectionCard } from "@/components/meta-connection-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function StoreSettingsPage({
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
  if (!store) notFound();

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Store Settings"
          description={`Manage ${store.name} configuration`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Settings" },
          ]}
        />

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Store settings</CardTitle>
              <CardDescription>
                Rename or reconnect {store.name}. This store is a Meta marketing data source, not a Shopify admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StoreSettingsForm
                store={store}
                providers={ECOMMERCE_PROVIDERS}
                updateAction={updateStoreAction}
              />
            </CardContent>
          </Card>
        </div>

        <div className="section">
          <MetaConnectionCard projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
