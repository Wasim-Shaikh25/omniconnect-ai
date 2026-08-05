import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrdersNextBestActionAction } from "@/modules/intelligence";

export async function OrdersNextBestAction({ projectId }: { projectId: string }) {
  const { action } = await getOrdersNextBestActionAction(projectId);
  if (!action || (action.atRiskHighValueCustomers.length === 0 && action.postDeliveryUpsells.length === 0 && !action.suppressed)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders next best action</CardTitle>
        <CardDescription>Recent order signals and follow-up opportunities.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {action.suppressed && (
          <p className="text-sm font-medium text-destructive">Sales outreach suppressed: {action.reasons.join(", ")}</p>
        )}
        {action.atRiskHighValueCustomers.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">At-risk high-value customers</p>
            <ul className="mt-1 space-y-1 text-sm">
              {action.atRiskHighValueCustomers.map((c) => (
                <li key={c.customerId} className="flex items-center justify-between">
                  <span>{c.displayName}</span>
                  <span className="text-xs text-muted-foreground">LTV {c.currency}{c.lifetimeValue.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {action.postDeliveryUpsells.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Post-delivery upsells</p>
            <ul className="mt-1 space-y-1 text-sm">
              {action.postDeliveryUpsells.map((u, i) => (
                <li key={i}>
                  <span className="font-medium">{u.upsellProduct.title}</span>
                  <span className="text-xs text-muted-foreground"> for order {u.orderId}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
