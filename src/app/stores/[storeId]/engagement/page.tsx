import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { conversationQueries } from "@/modules/conversations";
import { crmQueries } from "@/modules/crm";
import { StoreWorkflowNav } from "@/components/store-workflow-nav";
import { WorkflowCard } from "@/components/workflow-cards";
import { MessageCircle, MessageSquare, Users, Flame } from "lucide-react";

export default async function EngagementPage({
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

  const [conversations, followers] = await Promise.all([
    conversationQueries.listConversations(storeId, 100),
    crmQueries.listFollowers(storeId, 100),
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Engagement</h1>
        <p className="text-sm text-muted-foreground">{store.name}</p>
      </header>

      <StoreWorkflowNav storeId={storeId} />

      <section className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <WorkflowCard
          title="Inbox"
          href={`/stores/${storeId}/conversations`}
          description="All customer DMs in one place."
          icon={MessageCircle}
          count={conversations.length}
        />
        <WorkflowCard
          title="Comments"
          href={`/stores/${storeId}/commerce/comments`}
          description="Mentions and comments from Meta posts."
          icon={MessageSquare}
        />
        <WorkflowCard
          title="Followers"
          href={`/stores/${storeId}/followers`}
          description="Recent followers and first-time follower campaign."
          icon={Users}
          count={followers.length}
        />
        <WorkflowCard
          title="Hot Leads"
          href={`/stores/${storeId}/commerce/leads`}
          description="High-intent prospects to follow up with."
          icon={Flame}
        />
      </section>
    </main>
  );
}
