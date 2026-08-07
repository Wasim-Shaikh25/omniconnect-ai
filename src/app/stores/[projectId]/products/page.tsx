import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkStoreAccess } from "@/modules/workspaces";
import { ecommerceQueries } from "@/modules/ecommerce";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductList } from "@/components/product-list";
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

export default async function StoreProductsPage({
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

  const { items: products, total, totalPages } = await ecommerceQueries.listProductsPaginated(
    projectId,
    pagination,
    search,
  );

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Products"
          description={`Catalog imported from ${store.name} for AI insights and Meta campaigns`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Products" },
          ]}
        />

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Catalog ({total})</CardTitle>
              <CardDescription>
                Read-only view of products synced from your connected e-commerce source. Manage the catalog in Shopify (or your provider); use this data for AI content and coupon campaigns.
              </CardDescription>
              <div className="pt-2">
                <ListSearch placeholder="Search by title..." defaultValue={search} limit={pagination.limit} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProductList products={products} projectId={projectId} />
              <PaginationControls
                page={pagination.page}
                totalPages={totalPages}
                total={total}
                search={search}
                limit={pagination.limit}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
