import Link from "next/link";

import { requireStoreAccess } from "@/modules/organizations";
import { couponsQueries } from "@/modules/coupons";
import { growthQueries } from "@/modules/growth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AutomationCardProps {
  title: string;
  description: string;
  status: string;
  href: string;
  cta: string;
}

function AutomationCard({
  title,
  description,
  status,
  href,
  cta,
}: AutomationCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <p className="text-sm text-muted-foreground">{status}</p>
        <Button asChild variant="outline" size="sm" className="mt-3 w-fit">
          <Link href={href}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function AutomationsHubPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const { store } = await requireStoreAccess(storeId);

  const [welcomeCampaign, dmCampaigns, backInStock, commentUnlocks] =
    await Promise.all([
      couponsQueries.getCampaign(storeId),
      growthQueries.listCampaigns(storeId, 50),
      growthQueries.listBackInStock(storeId, 50),
      growthQueries.listCommentUnlockCampaigns(storeId),
    ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Automations</h1>
          <p className="text-sm text-muted-foreground">
            Active automations for {store.name}.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/stores/${storeId}`}>Back to store</Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AutomationCard
          title="Welcome & follow-up"
          description="Greet new followers with a welcome coupon and message."
          status={welcomeCampaign.active ? "Active" : "Paused"}
          href={`/stores/${storeId}/campaigns/first-follower`}
          cta="Configure welcome"
        />
        <AutomationCard
          title="DM campaigns"
          description="Abandoned cart, review request, re-engage, and custom DM campaigns."
          status={`${dmCampaigns.length} campaign(s)`}
          href={`/stores/${storeId}/commerce/growth`}
          cta="Manage DM campaigns"
        />
        <AutomationCard
          title="Back-in-stock alerts"
          description="Notify subscribers when out-of-stock products return."
          status={`${backInStock.length} subscriber(s)`}
          href={`/stores/${storeId}/commerce/growth`}
          cta="Manage back-in-stock"
        />
        <AutomationCard
          title="Comment-to-DM unlock"
          description="Auto-reply to comments with a keyword unlock and reward DM."
          status={`${commentUnlocks.length} campaign(s)`}
          href={`/stores/${storeId}/commerce/growth`}
          cta="Manage unlocks"
        />
        <AutomationCard
          title="AI assistant"
          description="Auto-reply to messages and escalate to a human when needed."
          status="Active on new messages"
          href={`/stores/${storeId}`}
          cta="Configure AI"
        />
        <AutomationCard
          title="Goal-based automations"
          description="Outcome-first templates: repeat purchases, abandoned carts, re-engagement, reviews, and more."
          status="Create from template"
          href={`/stores/${storeId}/automations/goals`}
          cta="New goal automation"
        />
        <Card className="flex flex-col border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Custom workflows</CardTitle>
            <CardDescription>
              Visual workflow builder for triggers, conditions, delays, and
              actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}