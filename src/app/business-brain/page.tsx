import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
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
import { ArrowLeft, Sparkles, Lock } from "lucide-react";

export default async function BusinessBrainPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasAccess = canUseIntelligenceFeature(user.plan, "marketingBrain");
  const { context } = hasAccess ? await getBusinessBrainContextAction() : { context: null };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </header>

      <section className="mb-8">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Marketing Brain
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask OmniConnect anything about your workspace. Answers are grounded in
          your stores, products, conversations, and followers.
        </p>
      </section>

      {hasAccess ? (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-medium">Operating rhythm KPIs</h2>
            <WorkspaceKpisSection />
          </section>

          <AskBusinessBrainForm />

          {context && context.citations.length > 0 && (
            <section className="mt-8">
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
            </section>
          )}
        </>
      ) : (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
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
      )}
    </main>
  );
}
