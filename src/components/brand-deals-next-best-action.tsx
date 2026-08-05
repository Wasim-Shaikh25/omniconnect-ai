import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrandDealsNextBestActionAction } from "@/modules/intelligence";

export async function BrandDealsNextBestAction({ projectId }: { projectId: string }) {
  const { action } = await getBrandDealsNextBestActionAction(projectId);
  if (!action) return null;

  const hasActions = action.followUps.length > 0 || action.deliverableRisks.length > 0;
  if (!hasActions) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Brand deals next best action</CardTitle>
        <CardDescription>{action.recommendedAction}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {action.followUps.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Follow up</p>
            <ul className="mt-1 space-y-1 text-sm">
              {action.followUps.map((d) => (
                <li key={d.dealId} className="flex items-center justify-between">
                  <span>{d.brandName}</span>
                  <span className="text-xs text-muted-foreground">{d.daysStuck}d stuck · {d.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {action.deliverableRisks.length > 0 && (
          <div>
            <p className="text-xs text-destructive">Deliverable / payment risk</p>
            <ul className="mt-1 space-y-1 text-sm">
              {action.deliverableRisks.map((d) => (
                <li key={d.dealId} className="flex items-center justify-between">
                  <span>{d.brandName}</span>
                  <span className="text-xs text-muted-foreground">{d.risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
