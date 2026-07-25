import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOperatingModelAction } from "@/modules/intelligence";
import type { OperatingModel, Story, IntegrationHealth, RiskTierRow, SuccessCriterion, Squad, Milestone } from "@/modules/intelligence";

export default async function OperatingModelPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const model = (await getOperatingModelAction()) as OperatingModel | null;
  if (!model) return null;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Operating model</h1>
          <p className="text-sm text-muted-foreground">UIL governance, 90-day plan, risk matrix, and success criteria.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">Back to settings</Link>
        </Button>
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Governance</CardTitle>
            <CardDescription>Executive sponsor: {model.governance.executiveSponsor} · Product architect: {model.governance.productArchitect}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {model.governance.squads.map((s: Squad) => (
                <li key={s.name} className="rounded border p-3 text-sm">
                  <p className="font-medium">{s.name} <span className="text-muted-foreground">— {s.owner}</span></p>
                  <p className="mt-1 text-muted-foreground">{s.responsibilities.join("; ")}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>90-day plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {model.milestones.map((m: Milestone) => (
                <li key={m.phase} className="text-sm">
                  <p className="font-medium">{m.phase} <span className="text-muted-foreground">({m.weeks})</span></p>
                  <p className="text-muted-foreground">{m.deliverables.join("; ")}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>First three intelligence stories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {model.stories.map((story: Story) => (
                <div key={story.id} className="rounded border p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium">{story.name}</span>
                    <span className="rounded border px-2 py-0.5 text-xs capitalize">{story.status}</span>
                  </div>
                  <p className="text-muted-foreground">{story.objective}</p>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <p><strong className="text-foreground">Owner:</strong> {story.ownerSquad}</p>
                    <p><strong className="text-foreground">Entities:</strong> {story.entities.join(", ")}</p>
                    <p><strong className="text-foreground">Events:</strong> {story.events.join(", ")}</p>
                    <p><strong className="text-foreground">Metrics:</strong> {story.metrics.join(", ")}</p>
                    <p className="sm:col-span-2"><strong className="text-foreground">Actions:</strong> {story.actions.join(", ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration health & data gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {model.integrationHealth.map((i: IntegrationHealth) => (
                <li key={i.integration} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{i.integration}</span>
                    <span className="text-xs text-muted-foreground">Freshness: {i.freshnessHrs}h · Identity: {i.identityQuality}</span>
                  </div>
                  {i.dataGaps.length > 0 && (
                    <p className="mt-1 text-muted-foreground">Gaps: {i.dataGaps.join("; ")}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action risk / approval matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4">Tier</th>
                    <th className="pb-2 pr-4">Examples</th>
                    <th className="pb-2 pr-4">Max audience</th>
                    <th className="pb-2 pr-4">Max discount</th>
                    <th className="pb-2 pr-4">Approvers</th>
                    <th className="pb-2">Outbound</th>
                  </tr>
                </thead>
                <tbody>
                  {model.riskMatrix.map((row: RiskTierRow) => (
                    <tr key={row.tier} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 font-medium">{row.tier.replace("TIER_", "Tier ")}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{row.examples.join("; ")}</td>
                      <td className="py-2 pr-4">{row.maxAudience.toLocaleString()}</td>
                      <td className="py-2 pr-4">{row.maxDiscountPct}%</td>
                      <td className="py-2 pr-4">{row.approvers.join(", ")}</td>
                      <td className="py-2">{row.outboundAllowed ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>First-year success criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {model.successCriteria.map((sc: SuccessCriterion) => (
                <li key={sc.id} className="flex flex-col gap-0.5 rounded border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{sc.metric}</span>
                  <span className="text-muted-foreground">Target: {sc.target} · {sc.frequency} · {sc.owner}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
