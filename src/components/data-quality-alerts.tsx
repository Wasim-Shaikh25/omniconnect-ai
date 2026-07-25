import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDataQualityIssuesAction } from "@/modules/intelligence";

function severityClass(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    case "HIGH":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
  }
}

export async function DataQualityAlerts({ storeId }: { storeId?: string }) {
  const { issues } = await getDataQualityIssuesAction(storeId);

  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data health</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">All metrics are fresh and source data looks healthy.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data health alerts</CardTitle>
        <CardDescription>{issues.length} open issue(s).</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {issues.map((issue) => (
            <li key={issue.id} className="flex items-start justify-between gap-4 text-sm">
              <div>
                <span
                  className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${severityClass(issue.severity)}`}
                >
                  {issue.severity.toLowerCase()}
                </span>
                <p className="mt-1 font-medium">{issue.source}</p>
                <p className="text-muted-foreground">{issue.impact}</p>
              </div>
              {issue.storeId && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/stores/${issue.storeId}`}>View store</Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
