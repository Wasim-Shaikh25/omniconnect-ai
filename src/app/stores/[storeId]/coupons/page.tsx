import Link from "next/link";

import { requireStoreAccess } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatExpiresAt(date: Date | null): string {
  if (!date) return "No expiry";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function StoreCouponsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const { store } = await requireStoreAccess(storeId);

  const coupons = await ecommerceQueries.listCoupons(storeId, 50);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Coupons</h1>
          <p className="text-sm text-muted-foreground">
            Discount codes for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
      </header>

      {coupons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No coupons yet. Generate one from the store page.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/stores/${storeId}`}>Generate coupon</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <Card key={coupon.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{coupon.code}</CardTitle>
                <CardDescription>
                  {coupon.status} · Expires {formatExpiresAt(coupon.expiresAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <span className="text-muted-foreground">Discount</span>{" "}
                  <span className="font-medium">{coupon.discountPct}%</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}