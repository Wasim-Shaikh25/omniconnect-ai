import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { Button } from "@/components/ui/button";
import { ProfileInspectorForm } from "./ProfileInspectorForm";

export default async function ProfileInspectorPage({
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

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profile Inspector</h1>
          <p className="text-sm text-muted-foreground">Analyze any public Instagram profile for {store.name}.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${projectId}/analytics/audience`}>Back to audience</Link>
        </Button>
      </header>

      <ProfileInspectorForm projectId={projectId} />
    </main>
  );
}
