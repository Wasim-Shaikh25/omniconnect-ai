import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStoreAccess } from "@/modules/organizations";
import {
  updateMarketingMemory,
  generateDailyBrief,
  type DailyBriefSection,
} from "@/modules/intelligence";
import { TodayFeed } from "@/components/today-feed";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import {
  BriefSectionCard,
  ProductPromotionCard,
  DmOpportunityCard,
  CommentInsightCard,
  CompetitorAlertCard,
  TrendingHashtagCard,
  BestTimeCard,
} from "@/components/marketing-brief-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  Lightbulb,
  AlertCircle,
  Package,
  MessageCircle,
  MessageSquare,
  Megaphone,
  Clock,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";

function sectionIcon(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (t.includes("follower")) return Users;
  if (t.includes("content")) return Lightbulb;
  if (t.includes("competitor")) return AlertCircle;
  if (t.includes("product")) return Package;
  if (t.includes("dm")) return MessageCircle;
  if (t.includes("comment")) return MessageSquare;
  if (t.includes("campaign")) return Megaphone;
  if (t.includes("time")) return Clock;
  return TrendingUp;
}

export default async function DailyMarketingPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const { user, store } = await requireStoreAccess(storeId);

  if (!user.organizationId) {
    redirect("/login");
  }

  const memory = await updateMarketingMemory(user.organizationId, storeId);
  const brief = await generateDailyBrief(user.organizationId, storeId, memory);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3">
            <Link href={`/stores/${storeId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to store
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Daily Marketing</h1>
          <p className="text-sm text-muted-foreground">
            Today&apos;s priorities for {store.name}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/business-brain">Ask Marketing Brain</Link>
        </Button>
      </header>

      <section className="mb-8">
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Today&apos;s recommended content
            </CardTitle>
            <CardDescription>
              {brief.contentIdea ?? "No content idea generated yet."}
            </CardDescription>
          </CardHeader>
          {brief.recommendedProductId && (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Recommended product: <span className="font-medium">{brief.recommendedProductTitle}</span>
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href={`/stores/${storeId}/content`}>Create content</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Today&apos;s Brief</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {brief.sections.map((section: DailyBriefSection) => (
            <BriefSectionCard
              key={section.title}
              section={section}
              icon={sectionIcon(section.title)}
            />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Actions</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <TodayFeed storeId={storeId} />
          <RecommendationsPanel storeId={storeId} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Opportunities</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <ProductPromotionCard
            productScores={memory.productScores}
            storeId={storeId}
          />
          <DmOpportunityCard patterns={memory.dmPatterns} storeId={storeId} />
          <CommentInsightCard
            patterns={memory.commentPatterns}
            storeId={storeId}
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Market Signals</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <CompetitorAlertCard
            changes={memory.competitorChanges}
            storeId={storeId}
          />
          <TrendingHashtagCard hashtags={memory.trendingHashtags} />
          <BestTimeCard time={brief.bestPostingTime} />
        </div>
      </section>
    </main>
  );
}
