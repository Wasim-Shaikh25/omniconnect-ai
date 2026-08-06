import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/modules/auth";
import { getUserProfile } from "@/modules/users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserStatusButtons } from "@/components/user-status-buttons";

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  await requireSuperAdmin();
  const { id } = await params;
  const user = await getUserProfile(id);
  if (!user) redirect("/admin/users");

  return (
    <Card>
      <CardHeader>
        <CardTitle>User details</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Name</span>
            <p className="font-medium">{user.name ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Role</span>
            <p className="font-medium">{user.role}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Plan</span>
            <p className="font-medium">{user.plan}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Super admin</span>
            <p className="font-medium">{user.isSuperAdmin ? "Yes" : "No"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className="font-medium">
              {user.banned ? "Banned" : user.suspendedAt ? "Suspended" : "Active"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Active project</span>
            <p className="font-medium">{user.projectId ?? "—"}</p>
          </div>
        </div>
        <div className="pt-2">
          <UserStatusButtons userId={user.id} suspendedAt={user.suspendedAt} banned={user.banned} />
        </div>
      </CardContent>
    </Card>
  );
}
