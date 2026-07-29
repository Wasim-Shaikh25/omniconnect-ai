import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import {
  listNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/modules/notifications";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaginationControls, ListSearch } from "@/components/pagination-controls";
import type { PaginationInput } from "@/shared/kernel";

function parsePagination(
  rawPage?: string,
  rawLimit?: string,
): PaginationInput {
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? "10", 10) || 10));
  return { page, limit };
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string; limit?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const paramsResolved = (await searchParams) ?? {};
  const pagination = parsePagination(paramsResolved.page, paramsResolved.limit);
  const search = paramsResolved.q?.trim();

  const { items: notifications, total, totalPages } = await listNotificationsAction(
    pagination,
    search,
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Stay on top of customer activity.
          </p>
        </div>
        <form action={markAllNotificationsAsReadAction}>
          <Button type="submit" variant="outline" size="sm">
            Mark all as read
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recent notifications</CardTitle>
          <CardDescription>
            {total} notification(s).
          </CardDescription>
          <div className="pt-2">
            <ListSearch placeholder="Search notifications..." defaultValue={search} limit={pagination.limit} />
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length > 0 ? (
            <>
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
              <div className="mt-6">
                <PaginationControls
                  page={pagination.page}
                  totalPages={totalPages}
                  total={total}
                  search={search}
                  limit={pagination.limit}
                />
              </div>
            </>
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
