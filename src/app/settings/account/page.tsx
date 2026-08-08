import { redirect } from "next/navigation";
import {
  getCurrentUser,
  changePasswordAction,
  requestEmailChangeAction,
  requestPhoneVerificationAction,
  verifyPhoneAction,
  removePhoneAction,
  signOutEverywhereAction,
} from "@/modules/auth";
import { env } from "@/shared/config";
import { listDataExportsAction } from "@/modules/users";
import { PageHeader } from "@/components/page-header";
import { AccountActions } from "@/components/account-actions";
import { AccountSecurityForms } from "@/components/account-security-forms";
import { PhoneVerificationForm } from "@/components/phone-verification-form";
import { SignOutEverywhereButton } from "@/components/sign-out-everywhere-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

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
    <div className="page-container">
      <div className="container max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Account"
          description="Manage your account security and preferences"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Settings", href: "/settings" },
            { label: "Account" },
          ]}
        />

        {emailChanged && (
          <Alert className="section mb-6 border-green-600/20 bg-green-600/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Your email address has been updated.
            </AlertDescription>
          </Alert>
        )}

        <div className="section space-y-6">
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
            <CardTitle>Sessions</CardTitle>
            <CardDescription>
              Manage your active sessions. Signing out everywhere invalidates all devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignOutEverywhereButton action={signOutEverywhereAction} />
          </CardContent>
        </Card>

        {env.SMS_PROVIDER !== "disabled" && (
          <Card>
            <CardHeader>
              <CardTitle>Phone number</CardTitle>
              <CardDescription>
                Add and verify a phone number for account recovery and notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PhoneVerificationForm
                phone={user.phone}
                phoneVerified={user.phoneVerified}
                requestAction={requestPhoneVerificationAction}
                verifyAction={verifyPhoneAction}
                removeAction={removePhoneAction}
              />
            </CardContent>
          </Card>
        )}

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
      </div>
    </div>
  );
}
