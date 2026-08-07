import { redirect, notFound } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import TrendsPageClient from "./trends-client";

export default async function TrendsPage({
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

  return <TrendsPageClient projectId={projectId} storeName={store.name} />;
}
