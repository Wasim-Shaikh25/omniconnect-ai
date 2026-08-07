import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { PageHeader } from "@/components/page-header";
import { getMarketingPerformance } from "@/modules/analytics/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatCurrency(value: number, currency: string | null): string {
  const code = currency ?? "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(value);
  } catch {
    return `${value} ${code}`;
  }
}

export default async function ProductAnalyticsPage({
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
  const { user, store } = access;
  if (!user.userId) notFound();

  const view = await getMarketingPerformance({ userId: user.userId, projectId });

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Product Performance"
          description={`Which products deserve promotion for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Analytics", href: `/stores/${projectId}/analytics` },
            { label: "Product" },
          ]}
        />

        <div className="section grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{view.product.totalProducts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{view.product.orders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCurrency(view.product.revenue, view.product.currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">AOV</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCurrency(
                  view.product.orders > 0 ? view.product.revenue / view.product.orders : 0,
                  view.product.currency,
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="section grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Why it looks like this</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{view.product.why}</p>
              <p className="mt-2 text-sm font-medium">{view.product.nextRecommendation}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top products to promote</CardTitle>
              <CardDescription>Highest-price products in your catalog.</CardDescription>
            </CardHeader>
            <CardContent>
              {view.product.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products yet.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {view.product.topProducts.map((p, i) => (
                    <li key={i} className="flex items-center justify-between py-2">
                      <span className="truncate pr-4">{p.title}</span>
                      <span className="font-medium">{formatCurrency(p.revenue, view.product.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}