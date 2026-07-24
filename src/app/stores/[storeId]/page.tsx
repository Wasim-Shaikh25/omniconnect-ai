import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import {
  connectStoreAction,
  ecommerceQueries,
  generateCouponAction,
  syncProductsAction,
} from "@/modules/ecommerce";
import { ConnectStoreForm } from "@/components/connect-store-form";
import { SyncProductsButton } from "@/components/sync-products-button";
import { GenerateCouponForm } from "@/components/generate-coupon-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return "—";
  return `${currency ?? "$"}${price.toFixed(2)}`;
}

export default async function StoreDetailPage({
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
  if (!store) notFound();

  const canManage = user.role === "ADMIN" || user.role === "STORE_OWNER";
  const [connection, products, coupons] = await Promise.all([
    ecommerceQueries.getStoreConnection(storeId),
    ecommerceQueries.listProducts(storeId),
    ecommerceQueries.listCoupons(storeId),
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">
            {store.provider}
            {connection.connected ? " · Connected" : " · Not connected"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/stores">Back to stores</Link>
        </Button>
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
            <CardDescription>
              {connection.connected
                ? `Connected via ${connection.integration?.provider}${
                    connection.integration?.shopDomain
                      ? ` (${connection.integration.shopDomain})`
                      : ""
                  }.`
                : "Connect this store to an eCommerce provider."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <ConnectStoreForm
                action={connectStoreAction}
                storeId={storeId}
                provider={store.provider}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Only owners/admins can manage connections.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coupons</CardTitle>
            <CardDescription>
              Generate a discount code through the connected provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canManage && connection.connected ? (
              <GenerateCouponForm
                action={generateCouponAction}
                storeId={storeId}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Connect the store first to generate coupons.
              </p>
            )}
            {coupons.length > 0 && (
              <ul className="space-y-2 border-t pt-4">
                {coupons.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-mono font-medium">{c.code}</span>
                    <span className="text-muted-foreground">
                      {c.discountPct}% · {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              {connection.productCount} synced from the provider catalog.
            </CardDescription>
          </div>
          {canManage && connection.connected && (
            <SyncProductsButton action={syncProductsAction} storeId={storeId} />
          )}
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <ul className="divide-y">
              {products.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-medium">{p.title}</span>
                  <span className="text-muted-foreground">
                    {formatPrice(p.price, p.currency)}
                    {p.inventory !== null ? ` · ${p.inventory} in stock` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No products yet. Connect the store and sync.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
