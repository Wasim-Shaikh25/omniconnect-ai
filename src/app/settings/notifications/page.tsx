import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { getNotificationPreferencesAction } from "@/modules/notifications";
import { PageHeader } from "@/components/page-header";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NotificationsSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const preferences = await getNotificationPreferencesAction();

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Notifications"
          description="Manage your notification preferences"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Settings", href: "/settings" },
            { label: "Notifications" },
          ]}
        />

          <div className="section space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Choose which events you want to be notified about and on which
                channels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferencesForm preferences={preferences} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification history</CardTitle>
              <CardDescription>View past notifications and alerts.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href="/notifications">View history</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
