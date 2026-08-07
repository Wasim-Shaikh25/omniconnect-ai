import { requireSuperAdmin } from "@/modules/auth";
import { listAdaptersAction } from "@/modules/ecommerce";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdapterActions } from "@/components/adapter-actions";

export default async function AdminAdaptersPage() {
  await requireSuperAdmin();
  const { items } = await listAdaptersAction();

  return (
    <div className="page-container">
      <div className="container max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Adapter Management"
          description="View and manage e-commerce adapters"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Admin", href: "/admin" },
            { label: "Adapters" },
          ]}
        />

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Adapter library</CardTitle>
              <CardDescription>
                View all generated e-commerce adapters, validate their connection, and approve or flag them.
              </CardDescription>
            </CardHeader>
            <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No adapters connected yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Provider</th>
                    <th className="text-left py-2 px-2">Project</th>
                    <th className="text-left py-2 px-2">Domain</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Last sync</th>
                    <th className="text-left py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((adapter) => (
                    <tr key={adapter.id} className="border-b">
                      <td className="py-2 px-2">{adapter.provider}</td>
                      <td className="py-2 px-2 font-mono text-xs">{adapter.projectId}</td>
                      <td className="py-2 px-2">{adapter.shopDomain ?? "—"}</td>
                      <td className="py-2 px-2">
                        {adapter.isActive ? (
                          <span className="text-green-600">Approved</span>
                        ) : (
                          <span className="text-amber-600">Flagged</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {adapter.lastSyncAt
                          ? new Date(adapter.lastSyncAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-2 px-2">
                        <AdapterActions adapter={adapter} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
