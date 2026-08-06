import Link from "next/link";
import { requireSuperAdmin } from "@/modules/auth";
import { listAllUsersAction, toggleUserSuperAdminAction } from "@/modules/users";
import { Plan } from "@/modules/workspaces";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleSuperAdminButton } from "@/components/toggle-super-admin-button";
import { UserStatusButtons } from "@/components/user-status-buttons";

interface AdminUsersPageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    role?: string;
    isSuperAdmin?: string;
    plan?: string;
    status?: string;
  }>;
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
  const result = await listAllUsersAction({
    page,
    limit,
    search: params.search,
    role: params.role,
    isSuperAdmin: params.isSuperAdmin,
    plan: params.plan,
    status: params.status,
  });

  function buildHref(nextPage: number) {
    const sp = new URLSearchParams();
    sp.set("page", String(nextPage));
    sp.set("limit", String(limit));
    if (params.search) sp.set("search", params.search);
    if (params.role) sp.set("role", params.role);
    if (params.isSuperAdmin) sp.set("isSuperAdmin", params.isSuperAdmin);
    if (params.plan) sp.set("plan", params.plan);
    if (params.status) sp.set("status", params.status);
    return `/admin/users?${sp.toString()}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>{result.total} registered accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="get" action="/admin/users" className="mb-4 flex flex-wrap items-end gap-2">
          <input
            name="search"
            defaultValue={params.search}
            placeholder="Search email or name"
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          <select name="role" defaultValue={params.role} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All roles</option>
            <option value="USER">USER</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
          <select name="isSuperAdmin" defaultValue={params.isSuperAdmin} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All admin states</option>
            <option value="true">Super admin</option>
            <option value="false">Not super admin</option>
          </select>
          <select name="plan" defaultValue={params.plan} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All plans</option>
            {Object.values(Plan).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select name="status" defaultValue={params.status} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
          <button type="submit" className="h-9 rounded-md border px-3 text-sm hover:bg-accent">
            Filter
          </button>
          <Link href="/admin/users" className="h-9 rounded-md border px-3 text-sm leading-9 hover:bg-accent">
            Reset
          </Link>
        </form>

        {result.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left">
                  <tr>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2 pr-4">Plan</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        <Link href={`/admin/users/${user.id}`} className="hover:underline">
                          {user.email}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{user.name ?? "—"}</td>
                      <td className="py-2 pr-4">{user.role}</td>
                      <td className="py-2 pr-4">{user.plan ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {user.banned ? (
                          <span className="rounded bg-destructive px-1.5 py-0.5 text-xs text-white">Banned</span>
                        ) : user.suspendedAt ? (
                          <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-xs text-white">Suspended</span>
                        ) : (
                          <span className="rounded bg-green-500 px-1.5 py-0.5 text-xs text-white">Active</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <ToggleSuperAdminButton
                            userId={user.id}
                            isSuperAdmin={user.isSuperAdmin}
                            action={toggleUserSuperAdminAction}
                          />
                          <UserStatusButtons
                            userId={user.id}
                            suspendedAt={user.suspendedAt}
                            banned={user.banned}
                          />
                        </div>
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
                  <Link href={buildHref(page - 1)} className="rounded-md border px-3 py-1 hover:bg-muted">
                    Previous
                  </Link>
                )}
                {page < result.totalPages && (
                  <Link href={buildHref(page + 1)} className="rounded-md border px-3 py-1 hover:bg-muted">
                    Next
                  </Link>
                )}
              </div>
            </nav>
          </>
        )}
      </CardContent>
    </Card>
  );
}
