import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSuperAdmin } from "@/modules/auth";
import { getSystemHealthAction } from "./_actions";

export default async function AdminHealthPage() {
  await requireSuperAdmin();
  const health = await getSystemHealthAction();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{health.users.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{health.users.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Suspended users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{health.users.suspended}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Banned users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{health.users.banned}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Errors (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{health.errors.last24h}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Queue waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{health.queue.waiting}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Queue active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{health.queue.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Queue failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{health.queue.failed}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI usage</CardTitle>
          <CardDescription>Token consumption and estimated cost.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left">
                <tr>
                  <th className="pb-2 pr-4">Window</th>
                  <th className="pb-2 pr-4">Requests</th>
                  <th className="pb-2 pr-4">Tokens</th>
                  <th className="pb-2 pr-4">Estimated cost</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 pr-4">Last 24 hours</td>
                  <td className="py-2 pr-4">{health.ai.requests24h}</td>
                  <td className="py-2 pr-4">{health.ai.tokens24h.toLocaleString()}</td>
                  <td className="py-2 pr-4">${health.ai.cost24h.toFixed(4)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4">Last 7 days</td>
                  <td className="py-2 pr-4">{health.ai.requests7d}</td>
                  <td className="py-2 pr-4">{health.ai.tokens7d.toLocaleString()}</td>
                  <td className="py-2 pr-4">${health.ai.cost7d.toFixed(4)}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">All time</td>
                  <td className="py-2 pr-4">{health.ai.requestsAllTime}</td>
                  <td className="py-2 pr-4">{health.ai.tokensAllTime.toLocaleString()}</td>
                  <td className="py-2 pr-4">${health.ai.costAllTime.toFixed(4)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
