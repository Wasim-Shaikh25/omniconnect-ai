import { listAllUsersAction, toggleUserSuperAdminAction } from "@/modules/users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleSuperAdminButton } from "@/components/toggle-super-admin-button";

export default async function AdminUsersPage() {
  const users = await listAllUsersAction();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>All registered accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
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
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{user.email}</td>
                    <td className="py-2 pr-4">{user.name ?? "—"}</td>
                    <td className="py-2 pr-4">{user.role}</td>
                    <td className="py-2 pr-4">{user.organizationId ? user.organizationId.slice(0, 8) : "—"}…</td>
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
        )}
      </CardContent>
    </Card>
  );
}
