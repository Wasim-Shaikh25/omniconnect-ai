import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompetitorNextBestActionAction } from "@/modules/intelligence";

export async function CompetitorNextBestAction({ projectId }: { projectId: string }) {
  const { action } = await getCompetitorNextBestActionAction(projectId);
  if (!action) return null;

  const hasActions = action.experiments.length > 0 || action.warnings.length > 0;
  if (!hasActions) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Competitor next best action</CardTitle>
        <CardDescription>Convert market patterns into controlled experiments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {action.experiments.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Suggested experiments</p>
            <ul className="mt-1 space-y-2 text-sm">
              {action.experiments.map((e, i) => (
                <li key={i}>
                  <p className="font-medium">{e.suggestedAngle}</p>
                  <p className="text-xs text-muted-foreground">{e.guardrail}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {action.warnings.length > 0 && (
          <div>
            <p className="text-xs text-destructive">Warnings</p>
            <ul className="mt-1 space-y-1 text-sm">
              {action.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
