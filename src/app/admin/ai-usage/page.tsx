import { requireSuperAdmin } from "@/modules/auth";
import { aiQueries } from "@/modules/ai/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "AI Usage",
};

export default async function AdminAIUsagePage() {
  await requireSuperAdmin();

  const recent = await aiQueries.listTokenUsage(100);
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const summary = await aiQueries.summarizeTokenUsageByDay({ start });

  const totalTokens = summary.reduce((sum, row) => sum + row.totalTokens, 0);
  const totalCost = summary.reduce((sum, row) => sum + (row.cost ?? 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Usage Summary</CardTitle>
          <CardDescription>Last 30 days across all workspaces.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Total tokens</p>
              <p className="text-2xl font-semibold">{totalTokens.toLocaleString()}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Requests</p>
              <p className="text-2xl font-semibold">
                {summary.reduce((sum, row) => sum + row.requests, 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm text-muted-foreground">Estimated cost</p>
              <p className="text-2xl font-semibold">${totalCost.toFixed(4)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent calls</CardTitle>
          <CardDescription>Last 100 AI completions recorded.</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI usage recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left">
                  <tr>
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Feature</th>
                    <th className="pb-2 pr-4">Model</th>
                    <th className="pb-2 pr-4">User</th>
                    <th className="pb-2 pr-4">Project</th>
                    <th className="pb-2 pr-4 text-right">Tokens</th>
                    <th className="pb-2 pr-4 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.createdAt.toLocaleString()}</td>
                      <td className="py-2 pr-4">{row.feature}</td>
                      <td className="py-2 pr-4 font-mono">{row.model}</td>
                      <td className="py-2 pr-4">{row.user?.email ?? "—"}</td>
                      <td className="py-2 pr-4">{row.project?.name ?? "—"}</td>
                      <td className="py-2 pr-4 text-right">{row.totalTokens.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right">{row.cost ? `$${row.cost.toFixed(6)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
