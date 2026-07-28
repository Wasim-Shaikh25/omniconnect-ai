import { notFound } from "next/navigation";
import { ECOMMERCE_PROVIDERS } from "@/modules/organizations";
import { requireStoreAccess } from "@/modules/organizations";
import {
  updateStoreAction,
  archiveStoreAction,
  restoreStoreAction,
  deleteStoreAction,
} from "@/modules/organizations";
import { StoreSettingsForm } from "@/components/store-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function StoreSettingsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const { store } = await requireStoreAccess(storeId);
  if (!store) notFound();

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Store settings</CardTitle>
          <CardDescription>
            Update, archive, or delete {store.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StoreSettingsForm
            store={store}
            providers={ECOMMERCE_PROVIDERS}
            updateAction={updateStoreAction}
            archiveAction={archiveStoreAction}
            restoreAction={restoreStoreAction}
            deleteAction={deleteStoreAction}
          />
        </CardContent>
      </Card>
    </main>
  );
}
