import { listSystemLogs } from "@/shared/observability";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; service?: string }>;
}) {
  const params = await searchParams;
  const logs = await listSystemLogs({
    level: params.level as "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL" | undefined,
    service: params.service,
    limit: 100,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>System logs</CardTitle>
        <CardDescription>Recent operational events and errors.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="mb-4 flex gap-2">
          <select name="level" defaultValue={params.level} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">All levels</option>
            {["DEBUG", "INFO", "WARN", "ERROR", "FATAL"].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <input
            name="service"
            defaultValue={params.service}
            placeholder="Filter by service"
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          <button type="submit" className="rounded-md border px-3 text-sm hover:bg-accent">
            Filter
          </button>
        </form>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No system logs yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="rounded border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{log.level}</span>
                  <span className="text-muted-foreground">{log.service}</span>
                  <span className="text-xs text-muted-foreground">{log.createdAt.toLocaleString()}</span>
                </div>
                <p className="mt-1">{log.message}</p>
                {log.metadata && (
                  <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
