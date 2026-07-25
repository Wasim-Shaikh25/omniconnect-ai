import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { getAutomationTemplatesAction, createGoalAutomationAction, goalAutomationService } from "@/modules/intelligence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function GoalAutomationsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const store = overview?.stores.find((s) => s.id === storeId);
  if (!store) notFound();

  const { templates } = await getAutomationTemplatesAction();

  const acceptanceReports = templates.map((t) => ({
    templateId: t.id,
    report: goalAutomationService.validateWorkflow({
      name: t.name,
      nodes: [
        {
          id: `${t.id}-node`,
          actionType: t.actionType,
          goalEvent: t.objective,
          entry: ["goal-selected"],
          exit: t.stopConditions,
          suppressesDuplicates: true,
          suppressesAtSend: true,
        },
      ],
      estimatedAudience: t.guardrails.maxAudience,
      assumptions: [t.objective, ...t.stopConditions],
    }),
  }));

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Goal-based automations</h1>
          <p className="text-sm text-muted-foreground">
            Outcome-first templates for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}/automations`}>Back to automations</Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-muted">{t.riskTier.replace("TIER_", "Tier ")}</span>
              </div>
              <CardDescription>{t.objective}</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createGoalAutomationAction} className="space-y-3">
                <input type="hidden" name="storeId" value={storeId} />
                <input type="hidden" name="templateId" value={t.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`target-${t.id}`}>Target</Label>
                    <Input id={`target-${t.id}`} name="target" type="number" defaultValue={t.defaultTarget} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`endDate-${t.id}`}>End date</Label>
                    <Input id={`endDate-${t.id}`} name="endDate" type="date" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`audience-${t.id}`}>Audience estimate</Label>
                    <Input id={`audience-${t.id}`} name="audienceEstimate" type="number" defaultValue={0} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`discount-${t.id}`}>Discount %</Label>
                    <Input id={`discount-${t.id}`} name="discountPct" type="number" defaultValue={0} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`days-${t.id}`}>Days since last touch</Label>
                    <Input id={`days-${t.id}`} name="daysSinceLastTouch" type="number" defaultValue={999} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`apd-${t.id}`}>Actions per day</Label>
                    <Input id={`apd-${t.id}`} name="actionsPerDay" type="number" defaultValue={0} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`consent-${t.id}`}
                    name="consentConfirmed"
                    type="checkbox"
                    value="true"
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor={`consent-${t.id}`} className="text-sm font-normal">
                    Confirm eligible audience has consented
                  </Label>
                </div>
                <Button type="submit" size="sm">
                  Draft goal automation
                </Button>
              </form>
              {(() => {
                const report = acceptanceReports.find((r) => r.templateId === t.id)?.report;
                if (!report) return null;
                return (
                  <div className="mt-4 rounded border p-3 text-sm">
                    <p className="font-medium">
                      Acceptance: {report.valid ? (
                        <span className="text-green-600">Valid</span>
                      ) : (
                        <span className="text-red-600">Needs edit</span>
                      )}
                    </p>
                    {report.warnings.length > 0 && (
                      <ul className="mt-1 list-inside list-disc text-amber-600">
                        {report.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    )}
                    {report.assumptions.length > 0 && (
                      <p className="mt-1 text-muted-foreground">Assumptions: {report.assumptions.join("; ")}</p>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
