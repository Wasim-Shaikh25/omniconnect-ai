import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";

export default async function DailyMarketingRedirectPage() {
  const user = await getCurrentUser();
  if (!user || !user.userId) {
    redirect("/login");
  }

  const overview = await organizationQueries.getOrganizationOverview(user.userId);
  const firstStore = overview?.stores[0];
  if (!firstStore) {
    redirect("/stores");
  }

  redirect(`/stores/${firstStore.id}/daily-marketing`);
}
