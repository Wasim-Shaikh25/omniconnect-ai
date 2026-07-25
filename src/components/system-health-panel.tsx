import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSystemHealthAction } from "@/modules/intelligence";

export async function SystemHealthPanel() {
  const { summary } = await getSystemHealthAction();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">System Health</CardTitle>
        <CardDescription>Operation latency and cost summary for your organization.</CardDescription>
      </CardHeader>
      <CardContent>
        {!summary ? (
          <p className="text-sm text-muted-foreground">No health data.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Avg latency</p>
              <p className="text-2xl font-semibold">
                {summary.avgLatencyMs !== null ? `${summary.avgLatencyMs.toFixed(2)}ms` : "—"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Total cost</p>
              <p className="text-2xl font-semibold">
                {summary.totalCostCents !== null ? `$${(summary.totalCostCents / 100).toFixed(2)}` : "—"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Operations</p>
              <p className="text-2xl font-semibold">{summary.operationCount}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Slowest op</p>
              <p className="font-medium">{summary.slowestOperation ?? "—"}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
