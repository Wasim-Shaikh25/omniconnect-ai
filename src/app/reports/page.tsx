import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { analyticsQueries } from "@/modules/analytics/server";
import { ecommerceQueries } from "@/modules/ecommerce";
import { crmQueries } from "@/modules/crm";
import { conversationQueries } from "@/modules/conversations";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface StoreReportRow {
  id: string;
  name: string;
  products: number;
  coupons: number;
  followers: number;
  conversations: number;
  connected: boolean;
}

function KpiCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {description && (
        <CardContent>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      )}
    </Card>
  );
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const overview = user.userId
    ? await organizationQueries.getOrganizationOverview(user.userId)
    : null;

  if (!overview) {
    return (
      <div className="page-container">
        <div className="container max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="Reports"
            description="Workspace reports and analytics"
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Reports" },
            ]}
          />
          <div className="section">
            <EmptyState
              icon={BarChart3}
              title="No organization found"
              description="Unable to load organization data."
              action={{
                label: "Back to Dashboard",
                onClick: () => window.location.href = "/dashboard",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const [kpis, rows] = await Promise.all([
    user.userId
      ? analyticsQueries.getWorkspaceKpis(user.userId)
      : Promise.resolve(null),
    Promise.all(
      overview.stores.map(async (store) => {
        const [connection, couponCount, followerCount, conversationCount] =
          await Promise.all([
            ecommerceQueries.getStoreConnection(store.id),
            ecommerceQueries.countCoupons(store.id),
            crmQueries.countFollowers(store.id),
            conversationQueries.countConversations(store.id),
          ]);
        return {
          id: store.id,
          name: store.name,
          products: connection.productCount,
          coupons: couponCount,
          followers: followerCount,
          conversations: conversationCount,
          connected: connection.connected,
        } satisfies StoreReportRow;
      }),
    ),
  ]);

  return (
    <div className="page-container">
      <div className="container max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Workspace Reports"
          description={overview.name}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Reports" },
          ]}
        />

        {kpis && (
          <div className="section">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Stores" value={kpis.storeCount} />
          <KpiCard title="Products" value={kpis.productCount} />
          <KpiCard title="Conversations" value={kpis.conversationCount} />
          <KpiCard title="Followers" value={kpis.followerCount} />
          <KpiCard title="Coupons" value={kpis.couponCount} />
          <KpiCard
            title="Connected integrations"
            value={kpis.connectedIntegrations}
          />
          <KpiCard
            title="Unread notifications"
            value={kpis.unreadNotificationCount}
          />
          </div>
          </div>
        )}

        <div className="section">
        <Card>
          <CardHeader>
            <CardTitle>Store breakdown</CardTitle>
            <CardDescription>
              Per-store activity and connection status.
            </CardDescription>
          </CardHeader>
          <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stores yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Store</th>
                    <th className="pb-2 font-medium">Connected</th>
                    <th className="pb-2 font-medium">Products</th>
                    <th className="pb-2 font-medium">Coupons</th>
                    <th className="pb-2 font-medium">Followers</th>
                    <th className="pb-2 font-medium">Conversations</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-3 font-medium">
                        <Link
                          href={`/stores/${row.id}`}
                          className="text-primary underline"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="py-3">
                        {row.connected ? "Yes" : "No"}
                      </td>
                      <td className="py-3">{row.products}</td>
                      <td className="py-3">{row.coupons}</td>
                      <td className="py-3">{row.followers}</td>
                      <td className="py-3">{row.conversations}</td>
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
