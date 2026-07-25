import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCampaignsNextBestActionAction } from "@/modules/intelligence";

export async function CampaignsNextBestAction({ storeId }: { storeId: string }) {
  const { action } = await getCampaignsNextBestActionAction(storeId);
  if (!action) return null;

  const hasActions = action.underperforming.length > 0 || action.highPerforming.length > 0;
  if (!hasActions) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Campaigns next best action</CardTitle>
        <CardDescription>{action.recommendedAction}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {action.underperforming.length > 0 && (
          <div>
            <p className="text-xs text-destructive">Underperforming</p>
            <ul className="mt-1 space-y-1 text-sm">
              {action.underperforming.map((c) => (
                <li key={c.campaignId} className="flex items-center justify-between">
                  <span>{c.campaignType}</span>
                  <span className="text-xs text-muted-foreground">{c.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {action.highPerforming.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">High-performing</p>
            <ul className="mt-1 space-y-1 text-sm">
              {action.highPerforming.map((c) => (
                <li key={c.campaignId} className="flex items-center justify-between">
                  <span>{c.campaignType}</span>
                  <span className="text-xs text-muted-foreground">{c.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
