import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { WorkspaceKpisSection } from "@/components/workspace-kpis-section";
import { AskBusinessBrainForm } from "./_ask-form";
import { getBusinessBrainContextAction, canUseIntelligenceFeature } from "@/modules/intelligence";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock } from "lucide-react";

export default async function BusinessBrainPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = canUseIntelligenceFeature(user.plan, "marketingBrain");
  const { context } = hasAccess ? await getBusinessBrainContextAction() : { context: null };

  return (
    <div className="page-container">
      <div className="container max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Marketing Brain"
          description="Ask OmniConnect anything about your workspace. Answers are grounded in your data."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Marketing Brain" },
          ]}
        />

        {hasAccess ? (
          <div className="space-y-6">
          <div className="section">
            <h2 className="section-title">Operating rhythm KPIs</h2>
            <WorkspaceKpisSection />
          </div>

          <div className="section">
          <AskBusinessBrainForm />
          </div>

          {context && context.citations.length > 0 && (
            <div className="section">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Grounded in your data</CardTitle>
                  <CardDescription>
                    Answers cite your Daily Brief, Marketing Memory, Journeys, and Recommendations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {context.citations.map((citation) => (
                      <li key={citation.reference} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-medium">
                          {citation.source}
                        </span>
                        <span className="text-muted-foreground">{citation.detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
          </div>
        ) : (
          <div className="section">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Marketing Brain is a Pro feature
              </CardTitle>
              <CardDescription>
                Upgrade to Pro to ask questions about your workspace, see operating-rhythm KPIs,
                and get grounded answers from your data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="default">
                <Link href="/settings/billing">Upgrade plan</Link>
              </Button>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
}
