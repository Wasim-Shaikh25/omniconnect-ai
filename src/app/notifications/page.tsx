import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import {
  listNotificationsAction,
  markNotificationAsReadAction,
} from "@/modules/notifications";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await listNotificationsAction();

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Stay on top of customer activity.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recent notifications</CardTitle>
          <CardDescription>
            {notifications.length} notification(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length > 0 ? (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start justify-between gap-4 py-4 text-sm ${
                    n.read ? "opacity-60" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.type} · {n.createdAt.toLocaleString()}
                    </p>
                  </div>
                  {!n.read && (
                    <form action={markNotificationAsReadAction}>
                      <input type="hidden" name="notificationId" value={n.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Mark as read
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No notifications yet. Simulate events from a store to generate
              them.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
