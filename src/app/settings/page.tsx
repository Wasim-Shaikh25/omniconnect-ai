import { redirect } from "next/navigation";
import Link from "next/link";
import { ROLES, getCurrentUser } from "@/modules/auth";
import {
  changeUserRoleAction,
  changeUserStoreAction,
  getUserProfile,
  listOrganizationUsers,
  updateProfileAction,
} from "@/modules/users";
import { ProfileForm } from "@/components/profile-form";
import { RoleSelectForm } from "@/components/role-select-form";
import { StoreSelectForm } from "@/components/store-select-form";
import { InviteMemberForm } from "@/components/invite-member-form";
import { TeamActionButton } from "@/components/team-action-button";
import { Button } from "@/components/ui/button";
import {
  inviteOrganizationMemberAction,
  revokeInviteAction,
  resendInviteAction,
  removeOrganizationMemberAction,
  organizationQueries,
} from "@/modules/workspaces";
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
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "USER";
  const members =
    isAdmin && user.userId
      ? (await listOrganizationUsers(user.userId)).items
      : [];
  const stores =
    isAdmin && user.userId
      ? await organizationQueries.listStores(user.userId)
      : [];
  const pendingInvites =
    isAdmin && user.userId
      ? await organizationQueries.listPendingInvites(user.userId)
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
            <CardTitle>Account</CardTitle>
            <CardDescription>Export your data or delete your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/account">Manage account</Link>
            </Button>
          </CardContent>
        </Card>

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
              <CardContent className="space-y-6">
                <InviteMemberForm
                  action={inviteOrganizationMemberAction}
                  stores={stores.map((s) => ({ id: s.id, name: s.name }))}
                />
                {pendingInvites.length > 0 && (
                  <ul className="space-y-3">
                    {pendingInvites.map((invite) => (
                      <li
                        key={invite.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                      >
                        <span className="font-medium">{invite.email}</span>
                        <span className="text-xs text-muted-foreground">Pending</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <TeamActionButton action={resendInviteAction} id={invite.id} label="Resend" />
                          <TeamActionButton action={revokeInviteAction} id={invite.id} label="Revoke" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {members.length > 0 ? (
                  <ul className="space-y-3">
                    {members.map((member) => (
                      <li
                        key={member.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                      >
                        <span className="font-medium">{member.email}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <RoleSelectForm
                            action={changeUserRoleAction}
                            userId={member.id}
                            currentRole={member.role}
                            roles={ROLES}
                          />
                          <StoreSelectForm
                            action={changeUserStoreAction}
                            userId={member.id}
                            stores={stores.map((s) => ({ id: s.id, name: s.name }))}
                            currentStoreId={member.projectId}
                          />
                          {member.id !== user.id && (
                            <TeamActionButton action={removeOrganizationMemberAction} id={member.id} label="Remove" />
                          )}
                        </div>
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
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Manage notification preferences and history.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/settings/notifications">Open notifications</Link>
                  </Button>
                </CardContent>
              </Card>

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

              <Card>
                <CardHeader>
                  <CardTitle>Quality & risk</CardTitle>
                  <CardDescription>
                    Run UIL quality checks and review risk mitigations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/settings/quality">Open quality</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rollout</CardTitle>
                  <CardDescription>
                    Manage feature gates and rollback controls.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/settings/rollout">Open rollout</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Operating model</CardTitle>
                  <CardDescription>
                    UIL governance, plan, risk matrix, and success criteria.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/settings/operating-model">View operating model</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Unified context</CardTitle>
                  <CardDescription>
                    Knowledge graph, feature profiles, and validation-driven context.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/settings/unified-context">Open unified context</Link>
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
