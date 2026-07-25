import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { WorkspaceKpisSection } from "@/components/workspace-kpis-section";
import { AskBusinessBrainForm } from "./_ask-form";
import { ArrowLeft, Sparkles } from "lucide-react";

export default async function BusinessBrainPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
          AI Business Brain
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask OmniConnect anything about your workspace. Answers are grounded in
          your stores, products, conversations, and followers.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Operating rhythm KPIs</h2>
        <WorkspaceKpisSection />
      </section>

      <AskBusinessBrainForm />
    </main>
  );
}
