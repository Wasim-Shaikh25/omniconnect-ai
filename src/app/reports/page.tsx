import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { analyticsQueries } from "@/modules/analytics";
import { ecommerceQueries } from "@/modules/ecommerce";
import { crmQueries } from "@/modules/crm";
import { conversationQueries } from "@/modules/conversations";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;

  if (!overview) {
    return (
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          No organization found.
        </p>
      </main>
    );
  }

  const [kpis, rows] = await Promise.all([
    user.organizationId
      ? analyticsQueries.getWorkspaceKpis(user.organizationId, user.id)
      : Promise.resolve(null),
    Promise.all(
      overview.stores.map(async (store) => {
        const [connection, coupons, followers, conversations] =
          await Promise.all([
            ecommerceQueries.getStoreConnection(store.id),
            ecommerceQueries.listCoupons(store.id, 500),
            crmQueries.listFollowers(store.id, 500),
            conversationQueries.listConversations(store.id, 500),
          ]);
        return {
          id: store.id,
          name: store.name,
          products: connection.productCount,
          coupons: coupons.length,
          followers: followers.length,
          conversations: conversations.length,
          connected: connection.connected,
        } satisfies StoreReportRow;
      }),
    ),
  ]);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspace Reports</h1>
          <p className="text-sm text-muted-foreground">{overview.name}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </header>

      {kpis && (
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </section>
      )}

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
    </main>
  );
}
