import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { checkStoreAccess } from "@/modules/workspaces";
import { ecommerceQueries } from "@/modules/ecommerce";
import { Button } from "@/components/ui/button";
import { ContentNextBestAction } from "@/components/content-next-best-action";
import { ContentStudioForms } from "@/components/content-studio-forms";
import { PublishPostForm } from "@/components/publish-post-form";
import { publishMediaAction } from "@/modules/content";

export default async function ContentStudioPage({
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
  const { store } = access;

  const products = await ecommerceQueries.listProducts(projectId, 100);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Studio</h1>
          <p className="text-sm text-muted-foreground">
            Generate AI post ideas and captions for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${projectId}`}>Back to store</Link>
        </Button>
      </header>

      <section className="mb-8 rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Publish to Instagram</h2>
        <PublishPostForm action={publishMediaAction} projectId={projectId} />
      </section>

      <ContentNextBestAction projectId={projectId} />

      <ContentStudioForms
        projectId={projectId}
        products={products.map((p) => ({ id: p.id, title: p.title }))}
      />
    </main>
  );
}