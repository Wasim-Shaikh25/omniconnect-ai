import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { conversationQueries } from "@/modules/conversations";
import { crmQueries } from "@/modules/crm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StoreWorkflowNav } from "@/components/store-workflow-nav";
import { MessageCircle, MessageSquare, Users, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface WorkflowTile {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
  count?: number;
}

export default async function EngagementPage({
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

  const [conversations, followers, leads] = await Promise.all([
    conversationQueries.listConversations(storeId, 100),
    crmQueries.listFollowers(storeId, 100),
    crmQueries.listFollowers(storeId, 100), // Leads fallback; replace with lead query when available.
  ]);

  const dmCount = conversations.length;
  const followerCount = followers.length;
  const leadCount = leads.length;

  const tiles: WorkflowTile[] = [
    {
      title: "Inbox",
      href: `/stores/${storeId}/conversations`,
      description: "All customer DMs in one place.",
      icon: MessageCircle,
      count: dmCount,
    },
    {
      title: "Comments",
      href: `/stores/${storeId}/commerce/comments`,
      description: "Mentions and comments from Meta posts.",
      icon: MessageSquare,
    },
    {
      title: "Followers",
      href: `/stores/${storeId}/followers`,
      description: "Recent followers and first-time follower campaign.",
      icon: Users,
      count: followerCount,
    },
    {
      title: "Hot Leads",
      href: `/stores/${storeId}/commerce/leads`,
      description: "High-intent prospects to follow up with.",
      icon: Flame,
      count: leadCount,
    },
  ];

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Engagement</h1>
        <p className="text-sm text-muted-foreground">{store.name}</p>
      </header>

      <StoreWorkflowNav storeId={storeId} />

      <section className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Card key={tile.title}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {tile.title}
                </CardTitle>
                <CardDescription>{tile.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {typeof tile.count === "number" && (
                  <p className="text-2xl font-semibold">{tile.count}</p>
                )}
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href={tile.href}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
