import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAgencyPortfolioAction } from "@/modules/intelligence";

export async function AgencyPortfolioPanel() {
  const { snapshot } = await getAgencyPortfolioAction();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Agency Portfolio</CardTitle>
        <CardDescription>Cross-store rollup of risks and opportunities.</CardDescription>
      </CardHeader>
      <CardContent>
        {!snapshot ? (
          <p className="text-sm text-muted-foreground">No portfolio data.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Stores</p>
              <p className="text-2xl font-semibold">{snapshot.storeCount}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Revenue estimate</p>
              <p className="text-2xl font-semibold">{snapshot.totalRevenueEstimate ?? "—"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Churn risk</p>
              <p className="text-2xl font-semibold">{snapshot.totalChurnRisk ?? "—"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Top recommendation</p>
              <p className="font-medium">{snapshot.topRecommendationType ?? "—"}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
