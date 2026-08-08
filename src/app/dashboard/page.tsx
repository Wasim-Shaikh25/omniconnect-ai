import Link from "next/link";
import { redirect } from "next/navigation";
import type { ElementType } from "react";
import { getCurrentUser } from "@/modules/auth";
import { isStaff } from "@/modules/auth/domain";
import { analyticsQueries } from "@/modules/analytics/server";
import { PageHeader } from "@/components/page-header";
import { DataQualityAlerts } from "@/components/data-quality-alerts";
import { TodayFeed } from "@/components/today-feed";
import { IntelligencePanel } from "@/components/intelligence-panel";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { GoalsPanel } from "@/components/goals-panel";
import { PredictionsPanel } from "@/components/predictions-panel";
import { LearningPanel } from "@/components/learning-panel";
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
  ArrowRight,
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
    <div className={`card-base group ${href ? 'card-hover cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-3 flex-shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block transition-transform hover:scale-105">{content}</Link> : content;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.userId) redirect("/onboarding");
  if (isStaff(user) && !user.projectId) redirect("/stores");
  if (isStaff(user) && user.projectId) redirect(`/stores/${user.projectId}`);

  const kpis = await analyticsQueries.getWorkspaceKpis(user.userId);
  if (!kpis) redirect("/stores");

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <PageHeader
          title={kpis.organizationName || "Workspace"}
          description={`Executive overview for ${user.email}`}
        />

        {/* KPI Grid */}
        <div className="section">
          <h2 className="section-title sr-only">Key Performance Indicators</h2>
          <div className="data-grid lg:grid-cols-4">
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
            <KpiCard
              title="Followers"
              value={kpis.followerCount}
              icon={Users}
            />
            <KpiCard
              title="Coupons"
              value={kpis.couponCount}
              icon={Ticket}
            />
            <KpiCard
              title="Connected Integrations"
              value={kpis.connectedIntegrations}
              icon={Plug}
            />
            <KpiCard
              title="Unread Notifications"
              value={kpis.unreadNotificationCount}
              icon={Bell}
              href="/notifications"
            />
            <KpiCard
              title="AI Brain Ready"
              value={1}
              icon={Brain}
              href="/business-brain"
            />
          </div>
        </div>

        {/* Today's Feed */}
        <div className="section">
          <h2 className="section-title">Today's Activity</h2>
          <TodayFeed />
        </div>

        {/* Intelligence & Insights */}
        <div className="section">
          <h2 className="section-title">Workspace Intelligence</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <WorkspaceKpis />
            <IntelligencePanel />
          </div>
        </div>

        {/* Recommendations & Goals */}
        <div className="section">
          <div className="grid gap-6 lg:grid-cols-2">
            <RecommendationsPanel />
            <GoalsPanel />
          </div>
        </div>

        {/* Predictions & Learning */}
        <div className="section">
          <div className="grid gap-6 lg:grid-cols-2">
            <PredictionsPanel />
            <LearningPanel />
          </div>
        </div>

        {/* Competitor & System Health */}
        <div className="section">
          <div className="grid gap-6 lg:grid-cols-3">
            <CompetitorIntelligencePanel />
            <SystemHealthPanel />
            <DataQualityAlerts />
          </div>
        </div>

        {/* Stores & Quick Actions */}
        <div className="section">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Stores Card */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Your Stores</CardTitle>
                  <CardDescription>
                    Manage your connected stores, view their catalogs and performance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {kpis.stores.length === 0 ? (
                    <div className="empty-state my-8">
                      <Store className="empty-state-icon" />
                      <h3 className="empty-state-title">No stores yet</h3>
                      <p className="empty-state-description">
                        Create your first store to connect a commerce catalog and social channels.
                      </p>
                      <Button asChild className="mt-4">
                        <Link href="/stores">
                          Create Store
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {kpis.stores.map((store) => (
                        <Link
                          key={store.id}
                          href={`/stores/${store.id}`}
                          className="table-row-hover flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground">{store.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {store.provider} · {store.productCount} products · {store.followerCount} followers
                              {store.connected && " · Connected"}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="shrink-0">
                            Open
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Jump to common workflows.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link href="/stores">
                    <Store className="mr-2 h-4 w-4" />
                    Manage Stores
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link href="/business-brain">
                    <Brain className="mr-2 h-4 w-4" />
                    AI Business Brain
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link href="/notifications">
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link href="/analytics/dashboard">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Analytics
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Help Links */}
        <div className="section">
          <Card>
            <CardHeader>
              <CardTitle>Get Help</CardTitle>
              <CardDescription>Find what you're looking for.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild variant="outline" className="justify-start" size="sm">
                  <Link href="/settings">Settings</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start" size="sm">
                  <Link href="/help">Help Center</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start" size="sm">
                  <Link href="/customers">Customer Directory</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start" size="sm">
                  <Link href="/inbox">Unified Inbox</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
