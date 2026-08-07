import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/workspaces";
import { PrismaTrackedAccountRepository } from "@/modules/analytics/server";
import { CompetitorNextBestAction } from "@/components/competitor-next-best-action";
import CompetitorsPageClient from "./competitors-client";

export default async function CompetitorsPage({
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

  const repository = new PrismaTrackedAccountRepository();
  const accounts = await repository.listByStore(projectId);

  return (
    <CompetitorsPageClient
      projectId={projectId}
      storeName={store.name}
      initialAccounts={accounts}
      nextBestAction={<CompetitorNextBestAction projectId={projectId} />}
    />
  );
}
