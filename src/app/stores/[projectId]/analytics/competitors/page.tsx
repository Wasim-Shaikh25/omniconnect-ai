import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { getCompetitorComparisonDashboard } from "@/modules/analytics/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CompetitorComparisonDashboard } from "@/modules/analytics";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function CompetitorComparisonPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }

  let dashboard: CompetitorComparisonDashboard | null = null;
  let error: string | null = null;
  try {
    dashboard = await getCompetitorComparisonDashboard({ projectId });
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load competitor comparison";
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Competitor comparison</h1>
          <p className="text-sm text-muted-foreground">Benchmark your page against tracked competitors.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/stores/${projectId}/analytics`}>Back to analytics</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/stores/${projectId}/commerce/competitors`}>Manage competitors</Link>
          </Button>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>}

      {dashboard && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace snapshot</CardTitle>
              <CardDescription>{dashboard.summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <Metric label="Posts" value={dashboard.workspace.postCount} />
                <Metric label="Posts/week" value={dashboard.workspace.postsPerWeek} />
                <Metric label="Reel ratio" value={`${dashboard.workspace.reelRatio}%`} />
                <Metric label="Avg hook length" value={dashboard.workspace.avgHookLength} />
                <Metric label="Avg caption length" value={dashboard.workspace.avgCaptionLength} />
                <Metric label="Avg engagement" value={dashboard.workspace.avgEngagement} />
              </div>
              {dashboard.workspace.topHashtags.length > 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Top hashtags: {dashboard.workspace.topHashtags.slice(0, 10).map((h) => `#${h}`).join(" ")}
                </p>
              )}
            </CardContent>
          </Card>

          {dashboard.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {dashboard.insights.map((insight, i) => (
                    <li key={i}>{insight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Tracked competitors</CardTitle>
              <CardDescription>{dashboard.competitors.length === 0 ? "No competitors tracked yet." : `${dashboard.competitors.length} competitor${dashboard.competitors.length === 1 ? "" : "s"} tracked.`}</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.competitors.length === 0 ? (
                <Button asChild size="sm">
                  <Link href={`/stores/${projectId}/commerce/competitors`}>Add your first competitor</Link>
                </Button>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Handle</th>
                        <th className="pb-2 pr-4 font-medium">Posts</th>
                        <th className="pb-2 pr-4 font-medium">Posts/wk</th>
                        <th className="pb-2 pr-4 font-medium">Reels %</th>
                        <th className="pb-2 pr-4 font-medium">Avg hook</th>
                        <th className="pb-2 pr-4 font-medium">Avg caption</th>
                        <th className="pb-2 pr-4 font-medium">Engagement</th>
                        <th className="pb-2 pr-4 font-medium">Likes</th>
                        <th className="pb-2 pr-4 font-medium">Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.competitors.map((competitor) => (
                        <tr key={competitor.accountId} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">@{competitor.handle}</td>
                          <td className="py-3 pr-4">{formatNumber(competitor.postCount)}</td>
                          <td className="py-3 pr-4">{competitor.postsPerWeek}</td>
                          <td className="py-3 pr-4">{competitor.reelRatio}%</td>
                          <td className="py-3 pr-4">{competitor.avgHookLength}</td>
                          <td className="py-3 pr-4">{competitor.avgCaptionLength}</td>
                          <td className="py-3 pr-4">{formatNumber(competitor.avgEngagement)}</td>
                          <td className="py-3 pr-4">{formatNumber(competitor.totalLikes)}</td>
                          <td className="py-3 pr-4">{formatNumber(competitor.totalComments)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{typeof value === "number" ? formatNumber(value) : value}</p>
    </div>
  );
}
