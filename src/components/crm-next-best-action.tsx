import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmNextBestActionAction } from "@/modules/intelligence";

export async function CrmNextBestAction() {
  const { action } = await getCrmNextBestActionAction();
  if (!action || (action.retentionCandidates.length === 0 && action.advocateCandidates.length === 0)) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>CRM next best action</CardTitle>
        <CardDescription>Retention and advocate candidates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {action.retentionCandidates.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Retention candidates</p>
            <ul className="mt-1 space-y-1 text-sm">
              {action.retentionCandidates.map((c) => (
                <li key={c.customerId} className="flex items-center justify-between">
                  <span>{c.displayName}</span>
                  <span className="text-xs text-muted-foreground">{c.segment}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {action.advocateCandidates.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Advocate / early-access candidates</p>
            <ul className="mt-1 space-y-1 text-sm">
              {action.advocateCandidates.map((c) => (
                <li key={c.customerId} className="flex items-center justify-between">
                  <span>{c.displayName}</span>
                  <span className="text-xs text-muted-foreground">{c.segment}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
