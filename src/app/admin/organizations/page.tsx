import { requireSuperAdmin } from "@/modules/auth";
import { listAllOrganizationsAction } from "@/modules/organizations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminOrganizationsPageProps {
  searchParams: Promise<{ page?: string; limit?: string }>;
}

function parsePage(raw: string | undefined) {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseLimit(raw: string | undefined) {
  const n = Number.parseInt(raw ?? "20", 10);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : 20;
}

export default async function AdminOrganizationsPage({ searchParams }: AdminOrganizationsPageProps) {
  await requireSuperAdmin();
  const params = await searchParams;
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit);
  const result = await listAllOrganizationsAction(page, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizations</CardTitle>
        <CardDescription>{result.total} tenants on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        {result.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No organizations yet.</p>
        ) : (
          <>
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
                  {result.items.map((org) => (
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
            <nav aria-label="Organization pagination" className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {result.page} of {result.totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={`/admin/organizations?page=${page - 1}&limit=${limit}`}
                    className="rounded-md border px-3 py-1 hover:bg-muted"
                  >
                    Previous
                  </a>
                )}
                {page < result.totalPages && (
                  <a
                    href={`/admin/organizations?page=${page + 1}&limit=${limit}`}
                    className="rounded-md border px-3 py-1 hover:bg-muted"
                  >
                    Next
                  </a>
                )}
              </div>
            </nav>
          </>
        )}
      </CardContent>
    </Card>
  );
}
