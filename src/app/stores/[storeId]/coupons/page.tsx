import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { checkStoreAccess } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CouponList } from "@/components/coupon-list";
import { PaginationControls, ListSearch } from "@/components/pagination-controls";
import type { PaginationInput } from "@/shared/kernel";

function parsePagination(
  rawPage?: string,
  rawLimit?: string,
): PaginationInput {
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? "10", 10) || 10));
  return { page, limit };
}

export default async function StoreCouponsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ q?: string; page?: string; limit?: string }>;
}) {
  const { projectId } = await params;
  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { store } = access;
  const paramsResolved = (await searchParams) ?? {};
  const pagination = parsePagination(paramsResolved.page, paramsResolved.limit);
  const search = paramsResolved.q?.trim();

  const { items: coupons, total, totalPages } = await ecommerceQueries.listCouponsPaginated(
    projectId,
    pagination,
    search,
  );

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
          <Link href={`/stores/${projectId}`}>Back to store</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Coupons ({total})</CardTitle>
          <CardDescription>
            Edit discount, status, and expiry, or remove coupons.
          </CardDescription>
          <div className="pt-2">
            <ListSearch placeholder="Search by code..." defaultValue={search} limit={pagination.limit} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {coupons.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No coupons yet. Generate one from the store page.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/stores/${projectId}`}>Generate coupon</Link>
              </Button>
            </div>
          ) : (
            <CouponList coupons={coupons} projectId={projectId} />
          )}
          <PaginationControls
            page={pagination.page}
            totalPages={totalPages}
            total={total}
            search={search}
            limit={pagination.limit}
          />
        </CardContent>
      </Card>
    </main>
  );
}
