import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { StoreWorkflowNav } from "@/components/store-workflow-nav";
import { WorkflowCard } from "@/components/workflow-cards";
import { Megaphone, Target, Lightbulb, Zap } from "lucide-react";

export default async function GrowthPage({
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

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Growth</h1>
        <p className="text-sm text-muted-foreground">{store.name}</p>
      </header>

      <StoreWorkflowNav storeId={storeId} />

      <section className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <WorkflowCard
          title="Campaigns"
          href={`/stores/${storeId}/campaigns`}
          description="Active and scheduled marketing campaigns."
          icon={Megaphone}
        />
        <WorkflowCard
          title="Competitors"
          href={`/stores/${storeId}/commerce/competitors`}
          description="Track and benchmark competitor pages."
          icon={Target}
        />
        <WorkflowCard
          title="Ideas"
          href={`/stores/${storeId}/content`}
          description="AI-generated content ideas grounded in your data."
          icon={Lightbulb}
        />
        <WorkflowCard
          title="Automations"
          href={`/stores/${storeId}/automations`}
          description="First-follower, DM, and comment automations."
          icon={Zap}
        />
      </section>
    </main>
  );
}
