import { requireSuperAdmin } from "@/modules/auth";
import { getPlanConfigsAction } from "@/modules/workspaces";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanConfigForm } from "@/components/plan-config-form";

export default async function AdminPlansPage() {
  await requireSuperAdmin();
  const { items } = await getPlanConfigsAction();

  return (
    <div className="space-y-6">
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
  );
}
