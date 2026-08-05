import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import {
  ECOMMERCE_PROVIDERS,
  createStoreAction,
  organizationQueries,
} from "@/modules/organizations";
import { CreateStoreForm } from "@/components/create-store-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function StoresPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const canManage = user.role === "ADMIN" || user.role === "STORE_OWNER";

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Stores</h1>
          <p className="text-sm text-muted-foreground">
            {overview ? overview.name : "No organization yet"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your stores</CardTitle>
            <CardDescription>
              Workspaces that hold eCommerce &amp; Meta connections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview && overview.stores.length > 0 ? (
              <ul className="space-y-2">
                {overview.stores.map((store) => (
                  <li key={store.id}>
                    <Link
                      href={`/stores/${store.id}`}
                      className="flex items-center justify-between rounded-md border p-3 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="font-medium">{store.name}</span>
                      <span className="text-muted-foreground">
                        {store.provider}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No stores yet.</p>
            )}
          </CardContent>
        </Card>

        {canManage && user.organizationId && (
          <Card>
            <CardHeader>
              <CardTitle>Add a store</CardTitle>
              <CardDescription>Create a new store workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <CreateStoreForm
                action={createStoreAction}
                providers={ECOMMERCE_PROVIDERS}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
