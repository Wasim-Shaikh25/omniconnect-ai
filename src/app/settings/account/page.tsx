import { redirect } from "next/navigation";
import { getCurrentUser, changePasswordAction, requestEmailChangeAction } from "@/modules/auth";
import { listDataExportsAction } from "@/modules/users";
import { AccountActions } from "@/components/account-actions";
import { AccountSecurityForms } from "@/components/account-security-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ emailChanged?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { emailChanged } = await searchParams;
  const exports = await listDataExportsAction();

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">Account</h1>
      <p className="text-sm text-muted-foreground">{user.email}</p>

      {emailChanged && (
        <p className="mt-4 text-sm text-green-600" role="status">
          Your email address has been updated.
        </p>
      )}

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Update your password or email address. Email changes must be confirmed from the new address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountSecurityForms
              changePasswordAction={changePasswordAction}
              requestEmailChangeAction={requestEmailChangeAction}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data export</CardTitle>
            <CardDescription>
              Download a copy of your data. Exports expire after 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountActions mode="export" exports={exports} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete account</CardTitle>
            <CardDescription>
              Deleting your account starts a 30-day grace period. You can sign
              back in within 30 days to restore your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountActions mode="delete" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
