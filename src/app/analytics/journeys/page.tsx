import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { getJourneysAction } from "@/modules/intelligence";
import { JourneyTimeline } from "@/components/journey-timeline";
import { Button } from "@/components/ui/button";
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
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customer journeys</h1>
          <p className="text-sm text-muted-foreground">
            Connected touchpoints: post view → profile visit → DM → coupon → order.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
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
    </main>
  );
}
