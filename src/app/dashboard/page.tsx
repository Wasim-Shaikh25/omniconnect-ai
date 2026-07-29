import Link from "next/link";
import { redirect } from "next/navigation";
import type { ElementType } from "react";
import { getCurrentUser } from "@/modules/auth";
import { analyticsQueries } from "@/modules/analytics";
import { DataQualityAlerts } from "@/components/data-quality-alerts";
import { TodayFeed } from "@/components/today-feed";
import { IntelligencePanel } from "@/components/intelligence-panel";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { GoalsPanel } from "@/components/goals-panel";
import { PredictionsPanel } from "@/components/predictions-panel";
import { LearningPanel } from "@/components/learning-panel";
import { AgencyPortfolioPanel } from "@/components/agency-portfolio-panel";
import { CompetitorIntelligencePanel } from "@/components/competitor-intelligence-panel";
import { SystemHealthPanel } from "@/components/system-health-panel";
import { WorkspaceKpis } from "@/components/workspace-kpis";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Store,
  Package,
  MessageCircle,
  Users,
  Ticket,
  Plug,
  Bell,
  Brain,
} from "lucide-react";

function KpiCard({
  title,
  value,
  icon: Icon,
  href,
}: {
  title: string;
  value: number;
  icon: ElementType;
  href?: string;
}) {
  const content = (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} className="block">{content}</Link> : content;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.organizationId) redirect("/onboarding");

  const kpis = await analyticsQueries.getWorkspaceKpis(
    user.organizationId,
    user.id,
  );
  if (!kpis) redirect("/stores");

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <section className="mb-8">
        <h1 className="text-2xl font-semibold">
          {kpis.organizationName || "Workspace"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Executive dashboard for {user.email}
        </p>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Stores"
          value={kpis.storeCount}
          icon={Store}
          href="/stores"
        />
        <KpiCard
          title="Products"
          value={kpis.productCount}
          icon={Package}
        />
        <KpiCard
          title="Conversations"
          value={kpis.conversationCount}
          icon={MessageCircle}
        />
        <KpiCard title="Followers" value={kpis.followerCount} icon={Users} />
        <KpiCard title="Coupons" value={kpis.couponCount} icon={Ticket} />
        <KpiCard
          title="Connected integrations"
          value={kpis.connectedIntegrations}
          icon={Plug}
        />
        <KpiCard
          title="Unread notifications"
          value={kpis.unreadNotificationCount}
          icon={Bell}
          href="/notifications"
        />
        <KpiCard
          title="AI Brain ready"
          value={1}
          icon={Brain}
          href="/business-brain"
        />
      </div>

      <section className="mb-8">
        <TodayFeed />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Intelligence KPIs</h2>
        <WorkspaceKpis />
      </section>

      <section className="mb-8">
        <IntelligencePanel />
      </section>

      <section className="mb-8 grid gap-6 md:grid-cols-2">
        <RecommendationsPanel />
        <GoalsPanel />
      </section>

      <section className="mb-8 grid gap-6 md:grid-cols-2">
        <PredictionsPanel />
        <LearningPanel />
      </section>

      <section className="mb-8 grid gap-6 md:grid-cols-3">
        <AgencyPortfolioPanel />
        <CompetitorIntelligencePanel />
        <SystemHealthPanel />
      </section>

      <section className="mb-8 grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Your stores</CardTitle>
            <CardDescription>
              Select a store to manage products, conversations, and growth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {kpis.stores.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No stores yet. Create your first store to connect a commerce
                  catalog and social channels.
                </p>
                <Button asChild>
                  <Link href="/stores">Create store</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {kpis.stores.map((store) => (
                  <li
                    key={store.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {store.provider} · {store.productCount} products ·{" "}
                        {store.followerCount} followers · {store.conversationCount}{" "}
                        conversations · {store.couponCount} coupons
                        {store.connected ? " · Connected" : " · Not connected"}
                        {store.lastProductSyncAt &&
                          ` · Last product sync ${new Date(store.lastProductSyncAt).toLocaleDateString("en-IN")}`}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/stores/${store.id}`}>Open</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump to the most common flows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/stores">Manage stores</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/business-brain">Ask AI Business Brain</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/notifications">Notifications</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/settings">Settings</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/help">Help center</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8 grid gap-6 md:grid-cols-3">
        <DataQualityAlerts />
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Cross-module deep links</CardTitle>
            <CardDescription>Jump to the modules that share unified context.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/customers">Customer directory</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/inbox">Unified inbox</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/analytics">Analytics</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/stores">Stores & integrations</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
