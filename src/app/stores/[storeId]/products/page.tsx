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
import { ProductList } from "@/components/product-list";

export default async function StoreProductsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const { store } = await requireStoreAccess(storeId);
  const products = await ecommerceQueries.listProducts(storeId, 100);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage products for {store.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/stores/${storeId}`}>Back to store</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Catalog ({products.length})</CardTitle>
          <CardDescription>
            Edit product details or remove products synced from your eCommerce provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductList products={products} storeId={storeId} />
        </CardContent>
      </Card>
    </main>
  );
}
