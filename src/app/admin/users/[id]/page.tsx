import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/modules/auth";
import { getUserProfile } from "@/modules/users";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserStatusButtons } from "@/components/user-status-buttons";
import { ImpersonateUserButton } from "@/components/impersonate-user-button";

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  await requireSuperAdmin();
  const { id } = await params;
  const user = await getUserProfile(id);
  if (!user) redirect("/admin/users");

  return (
    <div className="page-container">
      <div className="container max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title={user.email}
          description="User account details"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Admin", href: "/admin" },
            { label: "Users", href: "/admin/users" },
            { label: user.email },
          ]}
        />

        <div className="section">
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
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
          <UserStatusButtons userId={user.id} suspendedAt={user.suspendedAt} banned={user.banned} />
          <ImpersonateUserButton userId={user.id} />
        </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
