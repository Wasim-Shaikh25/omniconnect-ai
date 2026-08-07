import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkStoreAccess } from "@/modules/workspaces";
import {
  generateAdapterConfigAction,
  testAdapterConfigAction,
  connectAdapterAction,
} from "@/modules/ecommerce";
import { PageHeader } from "@/components/page-header";
import { ConnectAdapterForm } from "@/components/connect-adapter-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ConnectAdapterPage({
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
  const { store, user } = access;
  const canManage = user.role === "SUPER_ADMIN" || user.role === "USER";

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Connect a custom store"
          description={`Generate a dynamic adapter from API docs for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Integrations", href: `/stores/${projectId}/integrations` },
            { label: "Connect Custom Store" },
          ]}
        />

        <div className="section">
          <Card>
        <CardHeader>
          <CardTitle>Dynamic adapter</CardTitle>
          <CardDescription>
            Paste REST API documentation to generate a config mapping, enter credentials, test the connection, and save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <ConnectAdapterForm
              generateAction={generateAdapterConfigAction}
              testAction={testAdapterConfigAction}
              connectAction={connectAdapterAction}
              projectId={projectId}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owners/admins can manage connections.
            </p>
          )}
        </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
