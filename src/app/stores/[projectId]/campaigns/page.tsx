import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { checkStoreAccess } from "@/modules/workspaces";
import { couponsQueries } from "@/modules/coupons";
import { PageHeader } from "@/components/page-header";
import { CampaignsNextBestAction } from "@/components/campaigns-next-best-action";
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
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    notFound();
  }
  const { store } = access;

  const campaign = await couponsQueries.getCampaign(projectId);

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Campaigns"
          description={`Active automations for ${store.name}`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stores", href: "/stores" },
            { label: store.name, href: `/stores/${projectId}` },
            { label: "Campaigns" },
          ]}
        />

        <div className="section">
          <CampaignsNextBestAction projectId={projectId} />
        </div>

        <div className="section">
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
                <Link href={`/stores/${projectId}/campaigns/first-follower`}>
                  Configure campaign
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}