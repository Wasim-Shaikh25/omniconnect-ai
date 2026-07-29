import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { listDataExportsAction } from "@/modules/users";
import { AccountActions } from "@/components/account-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const exports = await listDataExportsAction();

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold">Account</h1>
      <p className="text-sm text-muted-foreground">{user.email}</p>

      <div className="mt-8 space-y-6">
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
