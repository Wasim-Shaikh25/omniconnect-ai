import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { getJourneysAction } from "@/modules/intelligence";
import { PageHeader } from "@/components/page-header";
import { JourneyTimeline } from "@/components/journey-timeline";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function JourneysPage() {
  const user = await getCurrentUser();
  if (!user || !user.userId) redirect("/login");

  const { journeys } = await getJourneysAction();

  const purchased = journeys.filter((j) => j.outcome === "PURCHASE").length;
  const totalRevenue = journeys.reduce((sum, j) => sum + (j.attributedRevenue ?? 0), 0);

  return (
    <div className="page-container">
      <div className="container max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Customer journeys"
          description="Connected touchpoints: post view → profile visit → DM → coupon → order"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Analytics" },
            { label: "Journeys" },
          ]}
        />

        <div className="section">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tracked journeys</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{journeys.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Converted</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{purchased}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Attributed revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">${totalRevenue.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="section">
      <Card>
        <CardHeader>
          <CardTitle>Journeys</CardTitle>
          <CardDescription>Most recent customer journeys across your stores.</CardDescription>
        </CardHeader>
        <CardContent>
          {journeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No journeys recorded yet. Journeys form as customers view posts, visit profiles, DM you, receive coupons, and order.
            </p>
          ) : (
            <ul className="space-y-3">
              {journeys.map((journey) => (
                <JourneyTimeline key={journey.id} journey={journey} />
              ))}
            </ul>
          )}
        </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
