import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { ecommerceQueries } from "@/modules/ecommerce";
import { listAttributionLinks } from "@/modules/attribution";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AttributionLinkForm } from "./_components/attribution-link-form";

function formatCurrency(value: number, currency?: string | null): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
  }).format(value);
}

export default async function AttributionDashboardPage({
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

  const [links, coupons] = await Promise.all([
    listAttributionLinks(projectId),
    ecommerceQueries.listCoupons(projectId, 100),
  ]);

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Attribution"
          description="Create checkout links with coupons and UTM tags; track revenue per campaign, coupon, and channel"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: "Analytics", href: `/stores/${projectId}/analytics` },
            { label: "Attribution" },
          ]}
        />

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>New Attribution Link</CardTitle>
              <CardDescription>
                Generates a checkout URL with coupon auto-apply and UTM parameters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttributionLinkForm projectId={projectId} coupons={coupons} />
            </CardContent>
          </Card>
        </div>

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
              <CardDescription>
                {links.length === 0
                  ? "No attribution links yet."
                  : `${links.length} link${links.length === 1 ? "" : "s"} tracked.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {links.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create a link above to start tracking coupon + UTM conversions.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Short code</th>
                        <th className="pb-2 pr-4 font-medium">URL</th>
                        <th className="pb-2 pr-4 font-medium">Coupon</th>
                        <th className="pb-2 pr-4 font-medium">UTM source</th>
                        <th className="pb-2 pr-4 font-medium">Clicks</th>
                        <th className="pb-2 pr-4 font-medium">Conversions</th>
                        <th className="pb-2 pr-4 font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {links.map((link) => (
                        <tr key={link.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{link.shortCode}</td>
                          <td className="py-3 pr-4 max-w-xs truncate">
                            <a
                              href={link.fullUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {link.fullUrl}
                            </a>
                          </td>
                          <td className="py-3 pr-4">{link.couponId ? "Yes" : "—"}</td>
                          <td className="py-3 pr-4">{link.utmSource}</td>
                          <td className="py-3 pr-4">{link.clicks}</td>
                          <td className="py-3 pr-4">{link.conversions}</td>
                          <td className="py-3 pr-4">{formatCurrency(link.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
