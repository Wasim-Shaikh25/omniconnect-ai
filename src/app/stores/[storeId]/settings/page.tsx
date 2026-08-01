import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ECOMMERCE_PROVIDERS, checkStoreAccess, updateStoreAction } from "@/modules/organizations";
import { StoreSettingsForm } from "@/components/store-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function StoreSettingsPage({
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
  if (!store) notFound();

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Store settings</CardTitle>
          <CardDescription>
            Rename or reconnect {store.name}. This store is a Meta marketing data source, not a Shopify admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StoreSettingsForm
            store={store}
            providers={ECOMMERCE_PROVIDERS}
            updateAction={updateStoreAction}
          />
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/stores">All stores</Link>
        </Button>
      </div>
    </main>
  );
}
