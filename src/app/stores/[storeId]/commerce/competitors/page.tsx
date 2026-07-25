import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { PrismaTrackedAccountRepository } from "@/modules/analytics/server";
import { CompetitorNextBestAction } from "@/components/competitor-next-best-action";
import CompetitorsPageClient from "./competitors-client";

export default async function CompetitorsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { storeId } = await params;
  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const store = overview?.stores.find((s) => s.id === storeId);
  if (!store) notFound();

  const repository = new PrismaTrackedAccountRepository();
  const accounts = await repository.listByStore(storeId);

  return (
    <>
      <CompetitorNextBestAction storeId={storeId} />
      <CompetitorsPageClient storeId={storeId} initialAccounts={accounts} />
    </>
  );
}
