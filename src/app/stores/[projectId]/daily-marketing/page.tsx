import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import {
  updateMarketingMemory,
  generateDailyBrief,
  canUseIntelligenceFeature,
  type DailyBriefSection,
} from "@/modules/intelligence";
import { PageHeader } from "@/components/page-header";
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
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { user, store } = access;

  if (!user.userId) {
    redirect("/login");
  }

  const hasProAccess = canUseIntelligenceFeature(user.plan, "nextBestAction");
  const memory = await updateMarketingMemory(user.userId, projectId);
  const brief = await generateDailyBrief(user.userId, projectId, memory);

  return (
    <div className="page-container">
      <div className="container max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Daily Marketing"
          description={`Today's priorities for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Daily Marketing" },
          ]}
          actions={
            hasProAccess ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/business-brain">Ask Marketing Brain</Link>
              </Button>
            ) : undefined
          }
        />

        <div className="section">
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
                  <Link href={`/stores/${projectId}/content`}>Create content</Link>
                </Button>
              </CardContent>
            )}
          </Card>
        </div>

        <div className="section">
          <div>
            <h2 className="section-title">Today&apos;s Brief</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {brief.sections.map((section: DailyBriefSection) => (
                <BriefSectionCard
                  key={section.title}
                  section={section}
                  icon={sectionIcon(section.title)}
                />
              ))}
            </div>
          </div>
        </div>

        {hasProAccess && (
          <>
            <div className="section">
              <div>
                <h2 className="section-title">Actions</h2>
                <div className="grid gap-6 md:grid-cols-2">
                  <TodayFeed projectId={projectId} />
                  <RecommendationsPanel projectId={projectId} />
                </div>
              </div>
            </div>

            <div className="section">
              <div>
                <h2 className="section-title">Opportunities</h2>
                <div className="grid gap-6 md:grid-cols-3">
                  <ProductPromotionCard
                    productScores={memory.productScores}
                    projectId={projectId}
                  />
                  <DmOpportunityCard patterns={memory.dmPatterns} projectId={projectId} />
                  <CommentInsightCard
                    patterns={memory.commentPatterns}
                    projectId={projectId}
                  />
                </div>
              </div>
            </div>

            <div className="section">
              <div>
                <h2 className="section-title">Market Signals</h2>
                <div className="grid gap-6 md:grid-cols-3">
                  <CompetitorAlertCard
                    changes={memory.competitorChanges}
                    projectId={projectId}
                  />
                  <TrendingHashtagCard hashtags={memory.trendingHashtags} />
                  <BestTimeCard time={brief.bestPostingTime} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
