import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { auditQueries } from "@/modules/users";
import { PageHeader } from "@/components/page-header";
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
  if (!["SUPER_ADMIN", "USER"].includes(user.role) || !user.userId) notFound();

  const logs = await auditQueries.listByOrganization(user.userId, 100);

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Audit log"
          description="Recent admin and system events for your organization"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Settings", href: "/settings" },
            { label: "Audit log" },
          ]}
        />

        <div className="section">
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
        </div>
      </div>
    </div>
  );
}
