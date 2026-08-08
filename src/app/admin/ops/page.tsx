import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { requireSuperAdmin } from "@/modules/auth";
import { getOperationsSnapshotAction } from "./_actions";

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

function latencyClass(ms: number | null): string {
  if (ms === null) return "text-muted-foreground";
  if (ms < 200) return "text-green-600";
  if (ms < 1000) return "text-yellow-600";
  return "text-destructive";
}

export default async function AdminOpsPage() {
  await requireSuperAdmin();
  const snapshot = await getOperationsSnapshotAction();

  return (
    <div className="page-container">
      <div className="container max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Operations"
          description="Real-time system metrics and performance"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Admin", href: "/admin" },
            { label: "Operations" },
          ]}
        />

        <div className="section space-y-6">
          <p className="text-sm text-muted-foreground">Generated at {snapshot.generatedAt}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Requests (15m)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(snapshot.requests.last15m)}</p>
            <p className="text-xs text-muted-foreground">
              {formatNumber(snapshot.requests.perMinute15m)} / minute
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Requests (1h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(snapshot.requests.last1h)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Errors (15m)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(snapshot.errors.last15m)}</p>
            <p className="text-xs text-muted-foreground">
              {formatNumber(snapshot.errors.httpErrors15m)} HTTP errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Errors (1h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(snapshot.errors.last1h)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">p95 latency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${latencyClass(snapshot.latency.p95ms)}`}>
              {snapshot.latency.p95ms !== null
                ? `${Math.round(snapshot.latency.p95ms)}ms`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatNumber(snapshot.latency.count)} samples
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Mean latency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${latencyClass(snapshot.latency.meanMs)}`}>
              {snapshot.latency.meanMs !== null
                ? `${Math.round(snapshot.latency.meanMs)}ms`
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Shopify webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(snapshot.webhooks.shopify.total15m)}</p>
            <p className="text-xs text-muted-foreground">
              {snapshot.webhooks.shopify.errorRate}% error rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Meta webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(snapshot.webhooks.meta.total15m)}</p>
            <p className="text-xs text-muted-foreground">
              {snapshot.webhooks.meta.errorRate}% error rate
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue depth</CardTitle>
          <CardDescription>Waiting, active, delayed, and failed jobs per queue.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left">
                <tr>
                  <th className="pb-2 pr-4">Queue</th>
                  <th className="pb-2 pr-4">Waiting</th>
                  <th className="pb-2 pr-4">Active</th>
                  <th className="pb-2 pr-4">Delayed</th>
                  <th className="pb-2 pr-4">Failed</th>
                  <th className="pb-2 pr-4">Paused</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(snapshot.queues).map(([name, counts]) => (
                  <tr key={name} className="border-b">
                    <td className="py-2 pr-4 font-medium">{name}</td>
                    {counts ? (
                      <>
                        <td className="py-2 pr-4">{formatNumber(counts.waiting)}</td>
                        <td className="py-2 pr-4">{formatNumber(counts.active)}</td>
                        <td className="py-2 pr-4">{formatNumber(counts.delayed)}</td>
                        <td className="py-2 pr-4">
                          {counts.failed > 0 ? (
                            <Badge variant="destructive">{formatNumber(counts.failed)}</Badge>
                          ) : (
                            formatNumber(counts.failed)
                          )}
                        </td>
                        <td className="py-2 pr-4">{formatNumber(counts.paused)}</td>
                      </>
                    ) : (
                      <td colSpan={5} className="py-2 pr-4 text-muted-foreground">
                        Queue unavailable
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent errors (15m)</CardTitle>
          <CardDescription>Last 50 ERROR/FATAL system logs.</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors in the last 15 minutes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left">
                  <tr>
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Level</th>
                    <th className="pb-2 pr-4">Service</th>
                    <th className="pb-2 pr-4">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.recentErrors.map((error) => (
                    <tr key={error.id} className="border-b">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {new Date(error.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={error.level === "FATAL" ? "destructive" : "default"}>
                          {error.level}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{error.service}</td>
                      <td className="py-2 pr-4 max-w-md truncate">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
