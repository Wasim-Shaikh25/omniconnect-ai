import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { checkStoreAccess } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { Button } from "@/components/ui/button";
import { ContentNextBestAction } from "@/components/content-next-best-action";
import { ContentStudioForms } from "@/components/content-studio-forms";

export default async function ContentStudioPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const access = await checkStoreAccess(storeId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { store } = access;

  const products = await ecommerceQueries.listProducts(storeId, 100);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Studio</h1>
          <p className="text-sm text-muted-foreground">
            Generate AI post ideas and captions for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
      </header>

      <ContentNextBestAction storeId={storeId} />

      <ContentStudioForms
        storeId={storeId}
        products={products.map((p) => ({ id: p.id, title: p.title }))}
      />
    </main>
  );
}