import { redirect } from "next/navigation";
import Link from "next/link";
import { ROLES, getCurrentUser } from "@/modules/auth";
import {
  changeUserRoleAction,
  getUserProfile,
  listOrganizationUsers,
  updateProfileAction,
} from "@/modules/users";
import { ProfileForm } from "@/components/profile-form";
import { RoleSelectForm } from "@/components/role-select-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getUserProfile(user.id);
  const isAdmin = user.role === "ADMIN" || user.role === "STORE_OWNER";
  const members =
    isAdmin && user.organizationId
      ? await listOrganizationUsers(user.organizationId)
      : [];

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Account settings</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </header>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              action={updateProfileAction}
              defaultName={profile?.name ?? ""}
              defaultImage={profile?.image ?? ""}
            />
          </CardContent>
        </Card>

        {isAdmin && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Team members</CardTitle>
                <CardDescription>Manage roles in your organization.</CardDescription>
              </CardHeader>
              <CardContent>
                {members.length > 0 ? (
                  <ul className="space-y-3">
                    {members.map((member) => (
                      <li
                        key={member.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                      >
                        <span className="font-medium">{member.email}</span>
                        <RoleSelectForm
                          action={changeUserRoleAction}
                          userId={member.id}
                          currentRole={member.role}
                          roles={ROLES}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Audit log</CardTitle>
                  <CardDescription>
                    Track admin and system events.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/settings/audit">View audit log</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Billing</CardTitle>
                  <CardDescription>
                    Manage your plan and subscription.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/settings/billing">View billing</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
