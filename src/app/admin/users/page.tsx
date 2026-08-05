import { requireSuperAdmin } from "@/modules/auth";
import { listAllUsersAction, toggleUserSuperAdminAction } from "@/modules/users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleSuperAdminButton } from "@/components/toggle-super-admin-button";

interface AdminUsersPageProps {
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

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireSuperAdmin();
  const params = await searchParams;
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit);
  const result = await listAllUsersAction(page, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>{result.total} registered accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        {result.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left">
                  <tr>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2 pr-4">Org</th>
                    <th className="pb-2 pr-4">Super admin</th>
                    <th className="pb-2 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{user.email}</td>
                      <td className="py-2 pr-4">{user.name ?? "—"}</td>
                      <td className="py-2 pr-4">{user.role}</td>
                      <td className="py-2 pr-4">{user.userId ? user.userId.slice(0, 8) : "—"}…</td>
                      <td className="py-2 pr-4">{user.isSuperAdmin ? "Yes" : "No"}</td>
                      <td className="py-2 pr-4">
                        <ToggleSuperAdminButton
                          userId={user.id}
                          isSuperAdmin={user.isSuperAdmin}
                          action={toggleUserSuperAdminAction}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav aria-label="User pagination" className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {result.page} of {result.totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={`/admin/users?page=${page - 1}&limit=${limit}`}
                    className="rounded-md border px-3 py-1 hover:bg-muted"
                  >
                    Previous
                  </a>
                )}
                {page < result.totalPages && (
                  <a
                    href={`/admin/users?page=${page + 1}&limit=${limit}`}
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
