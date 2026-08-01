import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/organizations";
import { listContentRecommendationsAction, createContentRecommendationAction } from "@/modules/analytics";
import { CreateRecommendationForm } from "@/components/create-recommendation-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentRecommendation } from "@/modules/analytics";

export default async function RecommendationsAnalyticsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const access = await checkStoreAccess(storeId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { user, store } = access;
  if (!user.organizationId) notFound();

  const { recommendations, error } = await listContentRecommendationsAction(storeId);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recommendations</h1>
          <p className="text-sm text-muted-foreground">AI content ideas for {store.name}.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}/analytics`}>Back to analytics</Link>
        </Button>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create a content idea</CardTitle>
          <CardDescription>Ask the AI for a post or reel idea.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateRecommendationForm action={createContentRecommendationAction} storeId={storeId} />
        </CardContent>
      </Card>

      {error && <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {(recommendations ?? []).length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No recommendations yet. Create your first idea above.
            </CardContent>
          </Card>
        ) : (
          (recommendations ?? []).map((rec: ContentRecommendation) => (
            <Card key={rec.id}>
              <CardHeader>
                <CardTitle className="text-base">{rec.title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="secondary">{rec.type.toLowerCase()}</Badge>
                  <span>{new Date(rec.generatedAt).toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">{rec.outline}</p>
                {rec.hashtags.length > 0 && (
                  <p className="mb-2 text-xs text-muted-foreground">{rec.hashtags.join(" ")}</p>
                )}
                {rec.audioSuggestion && (
                  <p className="text-xs text-muted-foreground">Audio: {rec.audioSuggestion}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
