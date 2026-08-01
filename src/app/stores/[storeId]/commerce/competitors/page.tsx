import { notFound, redirect } from "next/navigation";
import { checkStoreAccess } from "@/modules/organizations";
import { PrismaTrackedAccountRepository } from "@/modules/analytics/server";
import { CompetitorNextBestAction } from "@/components/competitor-next-best-action";
import CompetitorsPageClient from "./competitors-client";

export default async function CompetitorsPage({
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

  const repository = new PrismaTrackedAccountRepository();
  const accounts = await repository.listByStore(storeId);

  return (
    <>
      <CompetitorNextBestAction storeId={storeId} />
      <CompetitorsPageClient storeId={storeId} initialAccounts={accounts} />
    </>
  );
}
