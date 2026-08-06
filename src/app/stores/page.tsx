import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { isStaff } from "@/modules/auth/domain";
import {
  ECOMMERCE_PROVIDERS,
  createStoreAction,
  organizationQueries,
} from "@/modules/workspaces";
import { PageHeader } from "@/components/page-header";
import { CreateStoreForm } from "@/components/create-store-form";
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

  const overview = user.userId
    ? await organizationQueries.getOrganizationOverview(user.userId, user)
    : null;
  const canManage = user.role === "SUPER_ADMIN" || !isStaff(user);

  return (
    <div className="page-container">
      <div className="container max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Stores"
          description={overview ? overview.name : "Manage your store workspaces"}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores" },
          ]}
        />

        <div className="section grid gap-6 md:grid-cols-2">
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

        {canManage && user.userId && (
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
      </div>
    </div>
  );
}
