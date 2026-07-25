import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getIntelligenceFeedAction, dismissInsightAction } from "@/modules/intelligence";
import type { BusinessInsightRecord } from "@/modules/intelligence";

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

function typeClass(type: string): string {
  switch (type) {
    case "ANOMALY":
      return "text-amber-600";
    case "OPPORTUNITY":
      return "text-green-600";
    case "RISK":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

function InsightRow({ insight }: { insight: BusinessInsightRecord }) {
  return (
    <li className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${severityClass(insight.severity)}`}>
              {insight.severity.toLowerCase()}
            </span>
            <span className={`text-xs font-medium ${typeClass(insight.type)}`}>{insight.type.toLowerCase()}</span>
          </div>
          <h4 className="mt-1 text-sm font-semibold">{insight.title}</h4>
          <p className="text-sm text-muted-foreground">{insight.description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {insight.deepLink && (
            <Button asChild variant="outline" size="sm">
              <Link href={insight.deepLink}>Open</Link>
            </Button>
          )}
          <form action={dismissInsightAction}>
            <input type="hidden" name="insightId" value={insight.id} />
            <Button type="submit" variant="ghost" size="sm">
              Dismiss
            </Button>
          </form>
        </div>
      </div>

      {insight.evidence && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Evidence</summary>
          <div className="mt-2 space-y-1 text-muted-foreground">
            <p>{insight.evidence.summary}</p>
            {insight.evidence.signalIds.length > 0 && (
              <p className="text-xs">Signals: {insight.evidence.signalIds.slice(0, 5).join(", ")}</p>
            )}
            {insight.evidence.metricIds.length > 0 && (
              <p className="text-xs">Metrics: {insight.evidence.metricIds.slice(0, 5).join(", ")}</p>
            )}
          </div>
        </details>
      )}
    </li>
  );
}

export async function TodayFeed({ storeId }: { storeId?: string }) {
  const { insights } = await getIntelligenceFeedAction(storeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Today</CardTitle>
        <CardDescription>Prioritized intelligence from across your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight) => (
              <InsightRow key={insight.id} insight={insight} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
