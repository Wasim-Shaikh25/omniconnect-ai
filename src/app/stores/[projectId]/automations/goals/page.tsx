import { notFound, redirect } from "next/navigation";

import { checkStoreAccess } from "@/modules/workspaces";
import { getAutomationTemplatesAction, createGoalAutomationAction, goalAutomationService } from "@/modules/intelligence";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function GoalAutomationsPage({
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
  const { store } = access;

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
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Goal-based Automations"
          description={`Outcome-first templates for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Automations", href: `/stores/${projectId}/automations` },
            { label: "Goals" },
          ]}
        />

        <div className="section">
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
                <input type="hidden" name="projectId" value={projectId} />
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
        </div>
      </div>
    </div>
  );
}