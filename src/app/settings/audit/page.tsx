import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { auditQueries } from "@/modules/users";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "STORE_OWNER"].includes(user.role) || !user.userId) notFound();

  const logs = await auditQueries.listByOrganization(user.userId, 100);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit log</h1>
          <p className="text-sm text-muted-foreground">
            Recent admin and system events for your organization.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">Back to settings</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>{logs.length} entries.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audit events yet. Actions like role changes will appear here.
            </p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-col gap-1 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-muted-foreground">
                      {log.resource}
                      {log.resourceId ? ` · ${log.resourceId}` : ""}
                      {log.details ? ` — ${log.details}` : ""}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-muted-foreground">
                      {log.actorEmail ?? "System"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.createdAt.toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
