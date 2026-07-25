import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
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
import { updateMarketingMemory, generateDailyBrief } from "@/modules/intelligence";
import { Sparkles, TrendingUp, Package, MessageCircle, Users, Clock, AlertCircle, Hash, MessageSquare } from "lucide-react";

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

  const productScores = memory.productScores.slice(0, 5);
  const dmOpportunities = memory.dmPatterns.filter(
    (p) => p.category === "AVAILABILITY" || p.category === "SIZE_QUESTION",
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

      {brief.contentIdea && (
        <section className="mt-6 rounded-md bg-muted p-4">
          <p className="text-sm font-medium text-foreground">Today&apos;s content idea</p>
          <p className="text-sm text-muted-foreground">{brief.contentIdea}</p>
        </section>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {brief.sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {section.title}
              </CardTitle>
              <CardDescription>{section.detail}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xl font-semibold">{section.value}</p>
              {section.change && (
                <p className="text-xs text-muted-foreground">{section.change}</p>
              )}
              {section.cta && (
                <Button asChild variant="outline" size="sm">
                  <Link href={section.cta.href}>{section.cta.label}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products To Push
            </CardTitle>
            <CardDescription>Top products based on customer interest and activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {productScores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products yet. Sync your catalog.</p>
            ) : (
              <ul className="space-y-3">
                {productScores.map((p) => (
                  <li key={p.productId} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{p.productTitle}</p>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(p.compositeScore * 100)} pts
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.evidence}</p>
                    <Button asChild variant="outline" size="sm" className="mt-2">
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
              DM Insights
            </CardTitle>
            <CardDescription>Patterns detected in customer messages.</CardDescription>
          </CardHeader>
          <CardContent>
            {memory.dmPatterns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No DM patterns yet.</p>
            ) : (
              <ul className="space-y-3">
                {memory.dmPatterns.map((p) => (
                  <li key={p.category} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {p.category.replace(/_/g, " ")}
                      </p>
                      <span className="text-xs text-muted-foreground">{p.frequency}</span>
                    </div>
                    {p.samplePhrases.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        &ldquo;{p.samplePhrases[0]}&rdquo;
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {dmOpportunities.length > 0 && (
              <p className="mt-3 text-xs text-primary">
                {dmOpportunities.reduce((sum, p) => sum + p.frequency, 0)} high-intent message(s)
              </p>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
              <Link href={`/stores/${storeId}/conversations`}>Open inbox</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comment Insights
            </CardTitle>
            <CardDescription>Patterns detected in post comments.</CardDescription>
          </CardHeader>
          <CardContent>
            {memory.commentPatterns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comment patterns yet.</p>
            ) : (
              <ul className="space-y-3">
                {memory.commentPatterns.map((p) => (
                  <li key={p.category} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {p.category.replace(/_/g, " ")}
                      </p>
                      <span className="text-xs text-muted-foreground">{p.frequency}</span>
                    </div>
                    {p.samplePhrases.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        &ldquo;{p.samplePhrases[0]}&rdquo;
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
              <Link href={`/stores/${storeId}/commerce/comments`}>View comments</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <RecommendationsPanel storeId={storeId} />
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
            <p className="text-xs text-muted-foreground">Track followers in Engagement.</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/stores/${storeId}/engagement`}>View</Link>
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
            <p className="text-2xl font-semibold">{brief.bestPostingTime ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Based on recent engagement patterns</p>
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
            {memory.competitorChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No new competitor alerts yet.</p>
            ) : (
              <ul className="space-y-2">
                {memory.competitorChanges.map((c) => (
                  <li key={c.trackedAccountId} className="text-sm">
                    {c.handle}: {c.changeType}
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/stores/${storeId}/commerce/competitors`}>Track competitors</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Trending Hashtags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {memory.trendingHashtags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trending hashtags yet.</p>
            ) : (
              <ul className="space-y-2">
                {memory.trendingHashtags.map((h) => (
                  <li key={h.tag} className="text-sm flex justify-between">
                    <span>#{h.tag}</span>
                    <span className="text-muted-foreground">{h.postCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <ContentNextBestAction storeId={storeId} />
      </section>
    </main>
  );
}
