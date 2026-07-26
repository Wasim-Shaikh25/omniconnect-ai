import { listAllOrganizationsAction } from "@/modules/organizations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOrganizationsPage() {
  const organizations = await listAllOrganizationsAction();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizations</CardTitle>
        <CardDescription>All tenants on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        {organizations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left">
                <tr>
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Plan</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Stores</th>
                  <th className="pb-2 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{org.name}</td>
                    <td className="py-2 pr-4">{org.plan}</td>
                    <td className="py-2 pr-4">{org.subscriptionStatus ?? "—"}</td>
                    <td className="py-2 pr-4">{org.stores.length}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                      {org.id.slice(0, 8)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
