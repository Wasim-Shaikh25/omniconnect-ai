import { requireSuperAdmin } from "@/modules/auth";
import { PageHeader } from "@/components/page-header";
import { getPlanConfigsAction } from "@/modules/workspaces";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanConfigForm } from "@/components/plan-config-form";

export default async function AdminPlansPage() {
  await requireSuperAdmin();
  const { items } = await getPlanConfigsAction();

  return (
    <div className="page-container">
      <div className="container max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Plan Management"
          description="Edit feature limits for each subscription tier"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Admin", href: "/admin" },
            { label: "Plans" },
          ]}
        />

        <div className="section">
          <Card>
        <CardHeader>
          <CardTitle>Plan management</CardTitle>
          <CardDescription>Edit feature limits for each subscription tier.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((config) => (
              <PlanConfigForm key={config.plan} config={config} />
            ))}
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
