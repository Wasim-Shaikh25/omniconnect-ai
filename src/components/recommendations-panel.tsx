import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getRecommendationsAction,
  executeActionPlanAction,
  dismissRecommendationAction,
} from "@/modules/intelligence";
import type { RecommendationRecord, RiskTier } from "@/modules/intelligence";

function riskClass(riskTier: RiskTier): string {
  switch (riskTier) {
    case "TIER_4":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    case "TIER_3":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    case "TIER_2":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    default:
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
  }
}

function ImpactRange({ range }: { range: RecommendationRecord["impactRange"] }) {
  if (!range) return null;
  return (
    <span className="text-xs text-muted-foreground">
      Impact: {range.min}–{range.max} {range.unit}
    </span>
  );
}

function RecommendationRow({ rec }: { rec: RecommendationRecord }) {
  const requiresApproval = rec.riskTier === "TIER_3" || rec.riskTier === "TIER_4";

  return (
    <li className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${riskClass(rec.riskTier)}`}>
              {rec.riskTier.replace("TIER_", "Tier ")}
            </span>
            {rec.effort && <span className="text-xs text-muted-foreground">{rec.effort} effort</span>}
          </div>
          <h4 className="mt-1 text-sm font-semibold">{rec.title}</h4>
          <p className="text-sm text-muted-foreground">{rec.description}</p>
          <div className="mt-1 flex gap-3">
            <ImpactRange range={rec.impactRange} />
            {rec.confidence !== null && (
              <span className="text-xs text-muted-foreground">Confidence: {Math.round(rec.confidence * 100)}%</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {rec.deepLink && (
            <Button asChild variant="outline" size="sm">
              <Link href={rec.deepLink}>Open</Link>
            </Button>
          )}
          <form action={executeActionPlanAction}>
            <input type="hidden" name="recommendationId" value={rec.id} />
            <Button type="submit" variant="default" size="sm">
              {requiresApproval ? "Approve & run" : "Run"}
            </Button>
          </form>
          <form action={dismissRecommendationAction}>
            <input type="hidden" name="recommendationId" value={rec.id} />
            <Button type="submit" variant="ghost" size="sm">
              Dismiss
            </Button>
          </form>
        </div>
      </div>
    </li>
  );
}

export async function RecommendationsPanel({ storeId }: { storeId?: string }) {
  const { recommendations } = await getRecommendationsAction(storeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Next best actions</CardTitle>
        <CardDescription>Recommended actions from intelligence, ranked by impact and risk.</CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommendations right now.</p>
        ) : (
          <ul className="space-y-3">
            {recommendations.map((rec) => (
              <RecommendationRow key={rec.id} rec={rec} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
