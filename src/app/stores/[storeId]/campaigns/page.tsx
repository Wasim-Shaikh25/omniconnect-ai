import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { couponsQueries } from "@/modules/coupons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function CampaignsHubPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const overview = user.organizationId
    ? await organizationQueries.getOrganizationOverview(user.organizationId)
    : null;
  const store = overview?.stores.find((s) => s.id === storeId);
  if (!store) notFound();

  const campaign = await couponsQueries.getCampaign(storeId);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Active automations for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{campaign.name}</CardTitle>
            <CardDescription>
              Type: First-Time Follower · Status:{" "}
              {campaign.active ? "Active" : "Paused"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <span className="text-muted-foreground">Discount</span>
                <p className="font-medium">{campaign.discountPct}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Coupon TTL</span>
                <p className="font-medium">{campaign.couponTtlDays} days</p>
              </div>
              <div>
                <span className="text-muted-foreground">Updated</span>
                <p className="font-medium">
                  {new Date(campaign.updatedAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Message template</span>
              <p className="mt-1 rounded-md border bg-muted p-2 font-mono text-xs">
                {campaign.messageTemplate}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href={`/stores/${storeId}/campaigns/first-follower`}>
                Configure campaign
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
