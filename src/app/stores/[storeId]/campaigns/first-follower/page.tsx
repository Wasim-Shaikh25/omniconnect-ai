import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { crmQueries } from "@/modules/crm";
import {
  couponsQueries,
  updateCampaignAction,
  simulateFirstTimeFollower,
} from "@/modules/coupons";
import { FirstTimeFollowerCampaignForm } from "@/components/first-time-follower-campaign-form";
import { FirstTimeFollowerSimulator } from "@/components/first-time-follower-simulator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function FirstTimeFollowerCampaignPage({
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

  const canManage = user.role === "ADMIN" || user.role === "STORE_OWNER";
  const [campaign, followers] = await Promise.all([
    couponsQueries.getCampaign(storeId),
    crmQueries.listFollowers(storeId, 10),
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">
            First-Time Follower Campaign
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
      </header>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Campaign settings</CardTitle>
            <CardDescription>
              Configure the welcome discount and message template.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <FirstTimeFollowerCampaignForm
                action={updateCampaignAction}
                storeId={storeId}
                campaign={campaign}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Only owners/admins can edit campaign settings.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dev simulator</CardTitle>
            <CardDescription>
              Simulate a new follower and watch the end-to-end flow generate a
              coupon, AI message, conversation, and outbound send.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {process.env.NODE_ENV !== "production" && canManage ? (
              <FirstTimeFollowerSimulator
                action={simulateFirstTimeFollower}
                storeId={storeId}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Simulator is only available in development.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent followers</CardTitle>
          <CardDescription>
            {followers.length} follower(s) recorded. Coupon and message appear
            after a successful first-time follower flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {followers.length > 0 ? (
            <ul className="divide-y">
              {followers.map((f) => (
                <li key={f.id} className="space-y-1 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {f.username ?? f.igUserId ?? "unknown"}
                    </span>
                    <span className="text-muted-foreground">
                      {f.followedAt.toLocaleDateString()}
                    </span>
                  </div>
                  {f.couponId ? (
                    <div className="text-muted-foreground">
                      Coupon sent: <span className="font-mono">{f.couponId}</span>
                      {f.campaignEnrolledAt
                        ? ` · ${f.campaignEnrolledAt.toLocaleDateString()}`
                        : null}
                    </div>
                  ) : null}
                  {f.welcomeMessageText ? (
                    <p className="text-muted-foreground">
                      &ldquo;{f.welcomeMessageText}&rdquo;
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No followers yet. Simulate a follow event to create one.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
