import { requireStoreAccess } from "@/modules/organizations";
import { PrismaTrackedAccountRepository } from "@/modules/analytics/server";
import { CompetitorNextBestAction } from "@/components/competitor-next-best-action";
import CompetitorsPageClient from "./competitors-client";

export default async function CompetitorsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  await requireStoreAccess(storeId);

  const repository = new PrismaTrackedAccountRepository();
  const accounts = await repository.listByStore(storeId);

  return (
    <>
      <CompetitorNextBestAction storeId={storeId} />
      <CompetitorsPageClient storeId={storeId} initialAccounts={accounts} />
    </>
  );
}
