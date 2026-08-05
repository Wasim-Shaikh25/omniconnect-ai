import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.userId) redirect("/onboarding");
  redirect("/analytics/journeys");
}
