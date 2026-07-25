import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getUnifiedContextAction,
  getKnowledgeGraphAction,
  getLearningEvidenceAction,
  getModelOpsAction,
  getIntelligenceFeedbackKpisAction,
  evaluateChartAcceptanceAction,
} from "@/modules/intelligence";
import type { LearningEvidence } from "@/modules/intelligence";

export default async function UnifiedContextPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [context, graph, evidence, modelOps, feedbackKpis, chartAcceptance] = await Promise.all([
    getUnifiedContextAction(),
    getKnowledgeGraphAction(),
    getLearningEvidenceAction(),
    getModelOpsAction(),
    getIntelligenceFeedbackKpisAction(),
    evaluateChartAcceptanceAction("Revenue by channel", "Decide next week's ad budget"),
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Unified context</h1>
          <p className="text-sm text-muted-foreground">Knowledge graph, feature profiles, learning hierarchy, model ops, and validation-driven tools.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">Back to settings</Link>
        </Button>
      </header>

      <div className="space-y-6">
        {context && (
          <Card>
            <CardHeader>
              <CardTitle>Workspace context</CardTitle>
              <CardDescription>Fragmentation resolution across identity, metrics, timeline, recommendations, and actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between"><dt className="text-muted-foreground">Identity confidence</dt><dd>{context.identityConfidence}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Metric freshness</dt><dd>{context.metricFreshnessPct}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Open insights</dt><dd>{context.openInsightsCount}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Recent signals</dt><dd>{context.recentSignalCount}</dd></div>
                <div className="sm:col-span-2 flex justify-between"><dt className="text-muted-foreground">Top next action</dt><dd>{context.topNextAction ?? "None"}</dd></div>
              </dl>
              {!context.dataQuality.ok && (
                <p className="mt-3 text-sm text-destructive">Issues: {context.dataQuality.issues.join("; ")}</p>
              )}
            </CardContent>
          </Card>
        )}

        {graph && (
          <Card>
            <CardHeader>
              <CardTitle>Knowledge graph</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="font-medium">Content → product</p>
                  <p className="text-muted-foreground">{graph.contentToProduct.length} influences</p>
                </div>
                <div>
                  <p className="font-medium">Instagram → purchase</p>
                  <p className="text-muted-foreground">{graph.instagramToPurchase.length} threads</p>
                </div>
                <div>
                  <p className="font-medium">Campaign/coupon → order</p>
                  <p className="text-muted-foreground">{graph.campaignCouponToOrder.length} attributions</p>
                </div>
                <div>
                  <p className="font-medium">Content → brand outreach</p>
                  <p className="text-muted-foreground">{graph.contentToBrandOutreach.length} patterns</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="font-medium">Segment response</p>
                  <p className="text-muted-foreground">{graph.segmentResponseToOffer.length} segments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {evidence && (
          <Card>
            <CardHeader>
              <CardTitle>Learning evidence hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {evidence.map((e: LearningEvidence) => (
                  <li key={e.statement} className="rounded border p-3 text-sm">
                    <p className="font-medium capitalize">{e.type}</p>
                    <p>{e.statement}</p>
                    <p className="text-xs text-muted-foreground">Confidence: {e.confidence} · Sample: {e.sampleSize} · Source: {e.source}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {modelOps && (
          <Card>
            <CardHeader>
              <CardTitle>Model operations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between"><dt className="text-muted-foreground">Versions</dt><dd>{modelOps.versions.length}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Calibration drift</dt><dd>{modelOps.calibrationDrift}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Latency</dt><dd>{modelOps.latencyMs}ms</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Shadow mode</dt><dd>{modelOps.shadowMode ? "On" : "Off"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Rollback available</dt><dd>{modelOps.rollbackAvailable ? "Yes" : "No"}</dd></div>
              </dl>
            </CardContent>
          </Card>
        )}

        {feedbackKpis && (
          <Card>
            <CardHeader>
              <CardTitle>Intelligence feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between"><dt className="text-muted-foreground">Total ratings</dt><dd>{feedbackKpis.total}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Understood rate</dt><dd>{(feedbackKpis.understoodRate * 100).toFixed(0)}%</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Hours saved</dt><dd>{feedbackKpis.hoursSaved}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">False positive rate</dt><dd>{(feedbackKpis.falsePositiveRate * 100).toFixed(0)}%</dd></div>
              </dl>
            </CardContent>
          </Card>
        )}

        {chartAcceptance && (
          <Card>
            <CardHeader>
              <CardTitle>Chart acceptance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {chartAcceptance.accepted ? "Accepted" : "Rejected"}: {chartAcceptance.reason}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
