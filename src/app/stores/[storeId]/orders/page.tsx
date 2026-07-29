import Link from "next/link";

import { requireStoreAccess } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { OrdersNextBestAction } from "@/components/orders-next-best-action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaginationControls, ListSearch } from "@/components/pagination-controls";
import type { PaginationInput } from "@/shared/kernel";

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

function parsePagination(
  rawPage?: string,
  rawLimit?: string,
): PaginationInput {
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? "10", 10) || 10));
  return { page, limit };
}

export default async function StoreOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams?: Promise<{ q?: string; page?: string; limit?: string }>;
}) {
  const { storeId } = await params;
  const { store } = await requireStoreAccess(storeId);

  const paramsResolved = (await searchParams) ?? {};
  const pagination = parsePagination(paramsResolved.page, paramsResolved.limit);
  const search = paramsResolved.q?.trim();

  let orders: Awaited<ReturnType<typeof ecommerceQueries.listOrdersPaginated>>["items"] = [];
  let total = 0;
  let totalPages = 0;
  let error: string | null = null;
  try {
    const result = await ecommerceQueries.listOrdersPaginated(storeId, pagination, search);
    orders = result.items;
    total = result.total;
    totalPages = result.totalPages;
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

      <OrdersNextBestAction storeId={storeId} />

      {error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/stores/${storeId}`}>Check store connection</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Orders ({total})</CardTitle>
            <CardDescription>
              Orders synced from your eCommerce provider.
            </CardDescription>
            <div className="pt-2">
              <ListSearch placeholder="Search order or customer..." defaultValue={search} limit={pagination.limit} />
            </div>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No orders found. Connect an eCommerce provider to sync orders.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href={`/stores/${storeId}`}>Connect store</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
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
                <PaginationControls
                  page={pagination.page}
                  totalPages={totalPages}
                  total={total}
                  search={search}
                  limit={pagination.limit}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
