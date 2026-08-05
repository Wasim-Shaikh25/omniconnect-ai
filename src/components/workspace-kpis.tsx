import { getWorkspaceKpisAction } from "@/modules/intelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function WorkspaceKpis({ storeId, period = "7d" }: { storeId?: string; period?: "24h" | "7d" | "30d" }) {
  const snapshot = await getWorkspaceKpisAction(storeId, period);
  if (!snapshot) return null;

  const cards = [
    { label: "IAVA", value: snapshot.iava },
    { label: "Insights generated", value: snapshot.insightsGenerated },
    { label: "Insights acted", value: snapshot.insightsActed },
    { label: "Recs accepted", value: snapshot.recommendationsAccepted },
    { label: "Action plans executed", value: snapshot.actionPlansExecuted },
    { label: "Successful outcomes", value: snapshot.actionPlansSuccess },
    { label: "Outcomes linked", value: snapshot.outcomesLinked },
    { label: "Signal freshness %", value: snapshot.signalFreshnessPct },
    { label: "High-confidence links", value: snapshot.highConfidenceEntityLinks },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{c.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{c.value.toLocaleString()}</p>
          </CardContent>
        </Card>
      ))}
      {snapshot.identityConfidenceAvg !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Identity confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(snapshot.identityConfidenceAvg * 100).toFixed(0)}%</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
