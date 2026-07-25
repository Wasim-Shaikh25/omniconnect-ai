import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatCurrency(value: number, currency: string | null): string {
  return `${currency ?? "$"}${value.toFixed(2)}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default async function StoreOrdersPage({
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

  let orders: Awaited<ReturnType<typeof ecommerceQueries.listOrders>> = [];
  let error: string | null = null;
  try {
    orders = await ecommerceQueries.listOrders(storeId, 50);
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load orders.";
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Recent orders from {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
      </header>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/stores/${storeId}`}>Check store connection</Link>
            </Button>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No orders found. Connect an eCommerce provider to sync orders.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/stores/${storeId}`}>Connect store</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.externalId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Order {order.externalId}
                </CardTitle>
                <CardDescription>{formatDate(order.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground">Total</span>
                    <p className="font-medium">
                      {formatCurrency(order.total, order.currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Currency</span>
                    <p className="font-medium">{order.currency ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customer</span>
                    <p className="font-medium">{order.customerRef ?? "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
