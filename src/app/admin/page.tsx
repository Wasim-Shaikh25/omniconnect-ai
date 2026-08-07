import { requireSuperAdmin } from "@/modules/auth";
import { listAllOrganizationsAction } from "@/modules/workspaces";
import { listAllUsersAction } from "@/modules/users";
import { listSaaSCouponsAction } from "@/modules/workspaces";
import { listAllTicketsAction } from "@/modules/support";
import { listSystemLogs } from "@/shared/observability";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivitySquare } from "lucide-react";

export default async function AdminDashboardPage() {
  await requireSuperAdmin();
  const [organizations, users, coupons, tickets, logs] = await Promise.all([
    listAllOrganizationsAction(),
    listAllUsersAction(),
    listSaaSCouponsAction(),
    listAllTicketsAction(),
    listSystemLogs({ limit: 5 }),
  ]);

  const openTickets = tickets.items.filter((t) => t.status !== "CLOSED").length;

  return (
    <div className="page-container">
      <div className="container max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Admin Dashboard"
          description="Platform metrics and system logs"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Admin" },
          ]}
        />

        <div className="section">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{organizations.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Users</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{users.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Coupons</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{coupons.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Open tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{openTickets}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Recent system logs</CardTitle>
              <CardDescription>Latest operational events across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <EmptyState
                  icon={ActivitySquare}
                  title="No logs yet"
                  description="System logs will appear here as the platform processes events."
                />
              ) : (
                <ul className="divide-y">
                  {logs.map((log) => (
                    <li key={log.id} className="py-2 text-sm">
                      <span className="font-medium">[{log.level}]</span>{" "}
                      <span className="text-muted-foreground">{log.service}</span>{" "}
                      {log.message}{" "}
                      <span className="text-xs text-muted-foreground">
                        {log.createdAt.toLocaleString()}
                      </span>
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
