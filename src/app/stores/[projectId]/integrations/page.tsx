import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { checkStoreAccess } from "@/modules/workspaces";
import { ecommerceQueries } from "@/modules/ecommerce";
import { metaQueries } from "@/modules/meta/server";
import { PageHeader } from "@/components/page-header";
import { formatNumber } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function IntegrationsPage({
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

  const [ecommerce, meta] = await Promise.all([
    ecommerceQueries.getStoreConnection(projectId),
    metaQueries.getMetaConnection(projectId),
  ]);

  const connectedCount = [ecommerce.connected, meta.connected].filter(Boolean)
    .length;

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Integrations"
          description={`Connected apps and health for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Integrations" },
          ]}
        />

        <div className="section">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Health summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {connectedCount} of 2 integrations connected.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="section grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">eCommerce</CardTitle>
                <CardDescription>Shopify, custom adapter, or Mock</CardDescription>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  ecommerce.connected
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {ecommerce.connected ? "Connected" : "Disconnected"}
              </span>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {ecommerce.connected ? (
                <>
                  <p>
                    Provider:{" "}
                    <span className="font-medium">
                      {ecommerce.integration?.provider ?? "SHOPIFY"}
                    </span>
                  </p>
                  {ecommerce.integration?.shopDomain && (
                    <p>
                      Domain: {" "}
                      <span className="font-medium">
                        {ecommerce.integration.shopDomain}
                      </span>
                    </p>
                  )}
                  <p>
                    Products synced: {" "}
                    <span className="font-medium">
                      {formatNumber(ecommerce.productCount)}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No eCommerce store connected yet.
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/stores/${projectId}`}>Manage connection</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/stores/${projectId}/integrations/adapter`}>
                    Custom adapter
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Meta</CardTitle>
                <CardDescription>Facebook / Instagram</CardDescription>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  meta.connected
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {meta.connected ? "Connected" : "Disconnected"}
              </span>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {meta.connected ? (
                <>
                  <p>
                    Channel: <span className="font-medium">{meta.integration?.channel}</span>
                  </p>
                  {meta.integration?.accountId && (
                    <p>
                      Account: {" "}
                      <span className="font-medium">
                        {meta.integration.accountId}
                      </span>
                    </p>
                  )}
                  <p>
                    Connected at: {" "}
                    <span className="font-medium">
                      {meta.integration?.connectedAt.toLocaleDateString()}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No Facebook/Instagram account connected yet.
                </p>
              )}
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href={`/stores/${projectId}`}>Manage connection</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}