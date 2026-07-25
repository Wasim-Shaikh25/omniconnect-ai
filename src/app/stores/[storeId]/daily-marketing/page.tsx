import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { conversationQueries, type ConversationRecord } from "@/modules/conversations";
import { crmQueries } from "@/modules/crm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StoreWorkflowNav } from "@/components/store-workflow-nav";
import { ContentNextBestAction } from "@/components/content-next-best-action";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { IntelligencePanel } from "@/components/intelligence-panel";
import { formatCurrency } from "@/lib/currency";
import { Sparkles, TrendingUp, Users, MessageCircle, Package, Clock, AlertCircle } from "lucide-react";

function DmOpportunityCard({ conversation, storeId }: { conversation: ConversationRecord; storeId: string }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {conversation.channel} · {conversation.externalId ?? "unknown"}
        </p>
        <p className="text-xs text-muted-foreground">
          {conversation.status === "AI_ACTIVE" ? "AI active" : "Human active"} · {conversation.updatedAt.toLocaleString()}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={`/stores/${storeId}/conversations/${conversation.id}`}>Reply</Link>
      </Button>
    </li>
  );
}

export default async function DailyMarketingPage({
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

  const [products, conversations, followers] = await Promise.all([
    ecommerceQueries.listProducts(storeId, 10),
    conversationQueries.listConversations(storeId, 5),
    crmQueries.listFollowers(storeId, 5),
  ]);

  // Placeholder product promotion scores until ProductScore backend is implemented.
  const productsToPromote = products
    .slice()
    .sort((a, b) => (b.inventory ?? 0) - (a.inventory ?? 0))
    .slice(0, 3);

  const dmOpportunities = conversations.filter(
    (c) => c.status === "AI_ACTIVE" || c.status === "PENDING",
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Daily Marketing
        </h1>
        <p className="text-sm text-muted-foreground">{store.name}</p>
      </header>

      <StoreWorkflowNav storeId={storeId} />

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Today&apos;s Brief
            </CardTitle>
            <CardDescription>What matters right now for this store.</CardDescription>
          </CardHeader>
          <CardContent>
            <IntelligencePanel storeId={storeId} />
          </CardContent>
        </Card>

        <RecommendationsPanel storeId={storeId} />
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products To Push
            </CardTitle>
            <CardDescription>Top products based on inventory and activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {productsToPromote.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products yet. Sync your catalog.</p>
            ) : (
              <ul className="space-y-3">
                {productsToPromote.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(p.price, p.currency)} · {p.inventory ?? "?"} in stock
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/stores/${storeId}/content`}>Create content</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
              <Link href={`/stores/${storeId}/commerce/catalog`}>View all products</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              DM Opportunities
            </CardTitle>
            <CardDescription>High-intent conversations waiting for attention.</CardDescription>
          </CardHeader>
          <CardContent>
            {dmOpportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending DMs. Great work.</p>
            ) : (
              <ul className="space-y-3">
                {dmOpportunities.map((c) => (
                  <DmOpportunityCard key={c.id} conversation={c} storeId={storeId} />
                ))}
              </ul>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
              <Link href={`/stores/${storeId}/conversations`}>Open inbox</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Followers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{followers.length}</p>
            <p className="text-xs text-muted-foreground">Recent Meta followers</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/stores/${storeId}/followers`}>View followers</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Best Time To Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">6:00 PM</p>
            <p className="text-xs text-muted-foreground">Based on recent engagement patterns</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/stores/${storeId}/content`}>Create content</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Competitor Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No new competitor alerts yet.</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/stores/${storeId}/commerce/competitors`}>Track competitors</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <ContentNextBestAction storeId={storeId} />
      </section>
    </main>
  );
}
