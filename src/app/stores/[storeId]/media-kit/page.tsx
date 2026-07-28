import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { crmQueries } from "@/modules/crm";
import { conversationQueries } from "@/modules/conversations";
import { formatCurrency, formatNumber } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MediaKitPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const store = overview?.stores.find((s) => s.id === storeId);
  if (!store || !overview) notFound();

  const [connection, products, followerCount, conversationCount, orders, coupons] =
    await Promise.all([
      ecommerceQueries.getStoreConnection(storeId),
      ecommerceQueries.listProducts(storeId, 6),
      crmQueries.countFollowers(storeId),
      conversationQueries.countConversations(storeId),
      ecommerceQueries.listOrders(storeId, 100),
      ecommerceQueries.listCoupons(storeId, 100),
    ]);

  const revenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 print:max-w-none">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">
            Media kit · {overview.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="print:hidden"
          >
            <Link href={`/stores/${storeId}`}>Back to store</Link>
          </Button>
        </div>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Followers</CardDescription>
            <CardTitle className="text-3xl">
              {formatNumber(followerCount)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Products</CardDescription>
            <CardTitle className="text-3xl">
              {formatNumber(connection.productCount)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversations</CardDescription>
            <CardTitle className="text-3xl">
              {formatNumber(conversationCount)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(revenue, "INR")}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {store.name} is a {connection.connected ? "connected" : "growing"}{" "}
              store on OmniConnect AI with {products.length} products and{" "}
              {followerCount} followers. Engagement is tracked across Instagram,
              Facebook, and direct messages, with AI-powered replies and automated
              campaigns.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Active coupons: {coupons.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Recent orders: {orders.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>
              {products.length} synced from the catalog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No products synced yet.
              </p>
            ) : (
              <ul className="divide-y">
                {products.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-medium">{p.title}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(p.price, p.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Collab pitch</CardTitle>
            <CardDescription>
              Ready-made copy for brand outreach.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-md bg-muted p-4 text-sm leading-relaxed">
              Hi! I run {store.name} — a creator-led store with{" "}
              {formatNumber(followerCount)} followers and a catalog of{" "}
              {connection.productCount} products. I use OmniConnect AI to manage
              conversations, run campaigns, and track affiliate and brand-deal
              performance. I&apos;m open to sponsored content, product
              collabs, and affiliate partnerships that fit my audience.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
