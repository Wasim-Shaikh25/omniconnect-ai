import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { StoreWorkflowNav } from "@/components/store-workflow-nav";
import { ContentNextBestAction } from "@/components/content-next-best-action";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import {
  BriefSectionCard,
  ProductPromotionCard,
  DmOpportunityCard,
  CommentInsightCard,
  CompetitorAlertCard,
  TrendingHashtagCard,
  BestTimeCard,
  FollowerLinkCard,
} from "@/components/marketing-brief-cards";
import { updateMarketingMemory, generateDailyBrief, RecommendationConflictCard } from "@/modules/intelligence";
import { Sparkles, TrendingUp } from "lucide-react";

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

  if (!user.organizationId) redirect("/stores");

  const memory = await updateMarketingMemory(user.organizationId, storeId);
  const brief = await generateDailyBrief(user.organizationId, storeId, memory);

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

      {brief.contentIdea && (
        <section className="mt-6 rounded-md bg-muted p-4">
          <p className="text-sm font-medium text-foreground">Today&apos;s content idea</p>
          <p className="text-sm text-muted-foreground">{brief.contentIdea}</p>
        </section>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {brief.sections.map((section) => (
          <BriefSectionCard key={section.title} section={section} icon={TrendingUp} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <ProductPromotionCard productScores={memory.productScores.slice(0, 5)} storeId={storeId} />
        <DmOpportunityCard patterns={memory.dmPatterns} storeId={storeId} />
        <CommentInsightCard patterns={memory.commentPatterns} storeId={storeId} />
      </section>

      <section className="mt-6">
        <RecommendationConflictCard storeId={storeId} />
      </section>

      <section className="mt-6">
        <RecommendationsPanel storeId={storeId} />
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-3">
        <FollowerLinkCard storeId={storeId} />
        <BestTimeCard time={brief.bestPostingTime} />
        <CompetitorAlertCard changes={memory.competitorChanges} storeId={storeId} />
        <TrendingHashtagCard hashtags={memory.trendingHashtags} />
      </section>

      <section className="mt-6">
        <ContentNextBestAction storeId={storeId} />
      </section>
    </main>
  );
}
