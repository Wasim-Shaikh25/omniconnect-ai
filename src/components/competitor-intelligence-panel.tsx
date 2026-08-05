import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompetitorIntelligenceAction } from "@/modules/intelligence";

function deltaClass(delta: number | null): string {
  if (delta === null) return "text-muted-foreground";
  return delta >= 0 ? "text-green-600" : "text-red-600";
}

export async function CompetitorIntelligencePanel({ storeId }: { storeId?: string }) {
  const { insights } = await getCompetitorIntelligenceAction(storeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Competitor Benchmarks</CardTitle>
        <CardDescription>Tracked competitor metrics vs. your store baseline.</CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No competitor data. Track a competitor first.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {insights.map((insight) => (
              <li key={insight.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">@{insight.competitorHandle}</p>
                  <p className="text-xs text-muted-foreground">{insight.metricName.replace(/_/g, " ")}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{insight.value}</p>
                  <p className={`text-xs ${deltaClass(insight.benchmarkDelta)}`}>
                    {insight.benchmarkDelta === null
                      ? "—"
                      : `${insight.benchmarkDelta >= 0 ? "+" : ""}${insight.benchmarkDelta}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
