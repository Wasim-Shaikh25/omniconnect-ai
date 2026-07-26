import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { StoreWorkflowNav } from "@/components/store-workflow-nav";
import { WorkflowCard } from "@/components/workflow-cards";
import { formatCurrency } from "@/lib/currency";
import { DollarSign, Package, Ticket, Repeat } from "lucide-react";

export default async function RevenuePage({
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

  const [orders, products, coupons] = await Promise.all([
    ecommerceQueries.listOrders(storeId, 100).catch(() => []),
    ecommerceQueries.listProducts(storeId, 100),
    ecommerceQueries.listCoupons(storeId, 100),
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const currency = orders[0]?.currency ?? "USD";

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Revenue</h1>
        <p className="text-sm text-muted-foreground">{store.name}</p>
      </header>

      <StoreWorkflowNav storeId={storeId} />

      <section className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <WorkflowCard
          title="Sales"
          href={`/stores/${storeId}/orders`}
          description="Orders and revenue for this store."
          icon={DollarSign}
          count={orders.length}
          value={formatCurrency(totalRevenue, currency)}
        />
        <WorkflowCard
          title="Products"
          href={`/stores/${storeId}/commerce/catalog`}
          description="Catalog and promotion scores."
          icon={Package}
          count={products.length}
        />
        <WorkflowCard
          title="Coupons"
          href={`/stores/${storeId}/coupons`}
          description="Discount codes and usage."
          icon={Ticket}
          count={coupons.length}
        />
        <WorkflowCard
          title="Conversions"
          href={`/stores/${storeId}/analytics`}
          description="Conversion funnel and attribution."
          icon={Repeat}
        />
      </section>
    </main>
  );
}
