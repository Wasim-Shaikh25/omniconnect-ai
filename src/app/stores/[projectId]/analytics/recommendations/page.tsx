import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { listContentRecommendationsAction, createContentRecommendationAction } from "@/modules/analytics";
import { PageHeader } from "@/components/page-header";
import { CreateRecommendationForm } from "@/components/create-recommendation-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentRecommendation } from "@/modules/analytics";

export default async function RecommendationsAnalyticsPage({
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
  if (!user.userId) notFound();

  const { recommendations, error } = await listContentRecommendationsAction(projectId);

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Content Recommendations"
          description={`AI content ideas for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Analytics", href: `/stores/${projectId}/analytics` },
            { label: "Recommendations" },
          ]}
        />

        <div className="section">
          <Card>
        <CardHeader>
          <CardTitle>Create a content idea</CardTitle>
          <CardDescription>Ask the AI for a post or reel idea.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateRecommendationForm action={createContentRecommendationAction} projectId={projectId} />
        </CardContent>
          </Card>
        </div>

        {error && (
          <div className="section">
            <p className="text-sm text-destructive" role="alert">{error}</p>
          </div>
        )}

        <div className="section">
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
        </div>
      </div>
    </div>
  );
}
