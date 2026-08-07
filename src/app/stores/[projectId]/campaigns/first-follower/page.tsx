
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { env } from "@/shared/config";
import { checkStoreAccess } from "@/modules/workspaces";
import { crmQueries } from "@/modules/crm";
import {
  couponsQueries,
  updateCampaignAction,
  simulateFirstTimeFollower,
} from "@/modules/coupons";
import { PageHeader } from "@/components/page-header";
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
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { user, store } = access;

  const canManage = user.role === "SUPER_ADMIN" || user.role === "USER";
  const [campaign, followers] = await Promise.all([
    couponsQueries.getCampaign(projectId),
    crmQueries.listFollowers(projectId, 10),
  ]);

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="First-Time Follower Campaign"
          description={`Campaign settings for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Campaigns", href: `/stores/${projectId}/campaigns` },
            { label: "First Follower" },
          ]}
        />

        <div className="section">
          <div className="grid gap-6 md:grid-cols-2">
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
                projectId={projectId}
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
            {env.NODE_ENV !== "production" && canManage ? (
              <FirstTimeFollowerSimulator
                action={simulateFirstTimeFollower}
                projectId={projectId}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Simulator is only available in development.
              </p>
            )}
          </CardContent>
        </Card>
          </div>
        </div>

        <div className="section">
          <Card>
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
        </div>
      </div>
    </div>
  );
}