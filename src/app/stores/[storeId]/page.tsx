
import Link from "next/link";
import { env } from "@/shared/config";
import { requireStoreAccess } from "@/modules/organizations";
import {
  connectStoreAction,
  ecommerceQueries,
  generateCouponAction,
  syncProductsAction,
  type ProductRecord,
  type CouponRecord,
} from "@/modules/ecommerce";
import {
  connectMetaAction,
  simulateInboundAction,
} from "@/modules/meta";
import { metaQueries } from "@/modules/meta/server";
import { conversationQueries, type ConversationRecord } from "@/modules/conversations";
import { crmQueries, type FollowerRecord } from "@/modules/crm";
import { aiQueries } from "@/modules/ai/server";
import { updateAIConfigurationAction } from "@/modules/ai";
import { ConnectStoreForm } from "@/components/connect-store-form";
import { AISettingsForm } from "@/components/ai-settings-form";
import { SyncProductsButton } from "@/components/sync-products-button";
import { GenerateCouponForm } from "@/components/generate-coupon-form";
import { MetaConnectForm } from "@/components/meta-connect-form";
import { MetaSimulateForm } from "@/components/meta-simulate-form";
import { IntelligencePanel } from "@/components/intelligence-panel";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { GoalsPanel } from "@/components/goals-panel";
import { PredictionsPanel } from "@/components/predictions-panel";
import { LearningPanel } from "@/components/learning-panel";
import { CompetitorIntelligencePanel } from "@/components/competitor-intelligence-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  const { user, store } = await requireStoreAccess(storeId);

  const canManage = user.role === "ADMIN" || user.role === "STORE_OWNER";
  const isDev = env.NODE_ENV !== "production";
  const [
    connection,
    products,
    coupons,
    metaConnection,
    conversations,
    followers,
    aiConfig,
  ] = await Promise.all([
    ecommerceQueries.getStoreConnection(storeId),
    ecommerceQueries.listProducts(storeId),
    ecommerceQueries.listCoupons(storeId),
    metaQueries.getMetaConnection(storeId),
    conversationQueries.listConversations(storeId, 10),
    crmQueries.listFollowers(storeId, 10),
    aiQueries.getConfiguration(storeId),
  ]);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{store.name}</h1>
          <p className="text-sm text-muted-foreground">
            {store.provider}
            {connection.connected ? " · Connected" : " · Not connected"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/stores/${storeId}/products`}>Products</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/stores/${storeId}/coupons`}>Coupons</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/stores/${storeId}/settings`}>Settings</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/stores">Back to stores</Link>
          </Button>
        </div>
      </header>

      <section className="mt-8">
        <IntelligencePanel storeId={storeId} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <RecommendationsPanel storeId={storeId} />
        <GoalsPanel storeId={storeId} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <PredictionsPanel storeId={storeId} />
        <LearningPanel storeId={storeId} />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <CompetitorIntelligencePanel storeId={storeId} />
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
            <CardDescription>
              {connection.connected
                ? `Connected via ${connection.integration?.provider}${
                    connection.integration?.shopDomain
                      ? ` (${connection.integration.shopDomain})`
                      : ""
                  }.`
                : "Connect this store to an eCommerce provider."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <ConnectStoreForm
                action={connectStoreAction}
                storeId={storeId}
                provider={store.provider}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Only owners/admins can manage connections.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coupons</CardTitle>
            <CardDescription>
              Generate a discount code through the connected provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canManage && connection.connected ? (
              <GenerateCouponForm
                action={generateCouponAction}
                storeId={storeId}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Connect the store first to generate coupons.
              </p>
            )}
            {coupons.length > 0 && (
              <ul className="space-y-2 border-t pt-4">
                {coupons.map((c: CouponRecord) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-mono font-medium">{c.code}</span>
                    <span className="text-muted-foreground">
                      {c.discountPct}% · {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href={`/stores/${storeId}/coupons`}>View all coupons</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              {connection.productCount} synced from the provider catalog.
            </CardDescription>
          </div>
          {canManage && connection.connected && (
            <SyncProductsButton action={syncProductsAction} storeId={storeId} />
          )}
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <ul className="divide-y">
              {products.map((p: ProductRecord) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-medium">{p.title}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(p.price, p.currency)}
                    {p.inventory !== null ? ` · ${p.inventory} in stock` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No products yet. Connect the store and sync.
            </p>
          )}
        </CardContent>
      </Card>

      <h2 className="mt-10 text-lg font-semibold">Meta integration</h2>
      <p className="text-sm text-muted-foreground">
        Connect a Facebook Page or Instagram Business account. Inbound events
        become conversations and followers via domain events.
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meta connection</CardTitle>
            <CardDescription>
              {metaConnection.connected
                ? `Connected: ${metaConnection.integration?.channel}${
                    metaConnection.integration?.accountId
                      ? ` (${metaConnection.integration.accountId})`
                      : ""
                  }.`
                : "No Facebook/Instagram account connected yet."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <MetaConnectForm action={connectMetaAction} storeId={storeId} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Only owners/admins can manage connections.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>First-time follower campaign</CardTitle>
            <CardDescription>
              Auto-send a welcome coupon to new Instagram/Facebook followers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${storeId}/campaigns/first-follower`}>
                Configure campaign
              </Link>
            </Button>
          </CardContent>
        </Card>

        {isDev && canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Dev simulator</CardTitle>
              <CardDescription>
                Publish a simulated inbound Meta event to exercise the full
                event-driven flow without a live Meta app.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MetaSimulateForm
                action={simulateInboundAction}
                storeId={storeId}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <h2 className="mt-10 text-lg font-semibold">AI assistant</h2>
      <p className="text-sm text-muted-foreground">
        Configure the per-store system prompt and strategy. Replies are
        generated automatically when new customer messages arrive.
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>AI configuration</CardTitle>
            <CardDescription>
              Model: {aiConfig?.model ?? "gpt-4o-mini"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <AISettingsForm
                action={updateAIConfigurationAction}
                storeId={storeId}
                defaultValues={{
                  systemPrompt:
                    aiConfig?.systemPrompt ??
                    "You are a helpful eCommerce customer assistant.",
                  tone: aiConfig?.tone ?? "",
                  welcomeStrategy: aiConfig?.welcomeStrategy ?? "",
                  couponStrategy: aiConfig?.couponStrategy ?? "",
                  salesStrategy: aiConfig?.salesStrategy ?? "",
                  escalationRules: aiConfig?.escalationRules ?? "",
                  model: aiConfig?.model ?? "gpt-4o-mini",
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Only owners/admins can configure the AI assistant.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Commerce</CardTitle>
          <CardDescription>
            Instagram Shop sync, shoppable media, and product tags.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/stores/${storeId}/commerce/catalog`}
            className="text-sm text-primary underline"
          >
            Open commerce catalog
          </Link>
          <Link
            href={`/stores/${storeId}/commerce/comments`}
            className="ml-4 text-sm text-primary underline"
          >
            Comments & mentions
          </Link>
          <Link
            href={`/stores/${storeId}/commerce/leads`}
            className="ml-4 text-sm text-primary underline"
          >
            Leads
          </Link>
          <Link
            href={`/stores/${storeId}/commerce/growth`}
            className="ml-4 text-sm text-primary underline"
          >
            Growth
          </Link>
          <Link
            href={`/stores/${storeId}/commerce/trends`}
            className="ml-4 text-sm text-primary underline"
          >
            Trends
          </Link>
          <Link
            href={`/stores/${storeId}/commerce/competitors`}
            className="ml-4 text-sm text-primary underline"
          >
            Competitors
          </Link>
          <Link
            href={`/stores/${storeId}/content`}
            className="ml-4 text-sm text-primary underline"
          >
            Content Studio
          </Link>
          <Link
            href={`/stores/${storeId}/orders`}
            className="ml-4 text-sm text-primary underline"
          >
            Orders
          </Link>
          <Link
            href={`/stores/${storeId}/analytics`}
            className="ml-4 text-sm text-primary underline"
          >
            Analytics
          </Link>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>
            Active automations like first-time follower welcome.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href={`/stores/${storeId}/campaigns`}>View campaigns</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>
            View all customer conversations and take over or resume AI for each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href={`/stores/${storeId}/conversations`}>
              View conversations
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent conversations</CardTitle>
            <CardDescription>
              {conversations.length} conversation(s) from Meta messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {conversations.length > 0 ? (
              <ul className="divide-y">
                {conversations.map((c: ConversationRecord) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-medium">
                      {c.channel} · {c.externalId ?? "—"}
                    </span>
                    <span className="text-muted-foreground">{c.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No conversations yet. Simulate a message to create one.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Followers</CardTitle>
            <CardDescription>
              {followers.length} follower(s) recorded from Meta events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {followers.length > 0 ? (
              <ul className="divide-y">
                {followers.map((f: FollowerRecord) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-medium">
                      {f.username ?? f.igUserId ?? "unknown"}
                    </span>
                    <span className="text-muted-foreground">
                      {f.followedAt.toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No followers yet. Simulate a follow event to create one.
              </p>
            )}
            <Button asChild variant="outline" size="sm" className="mt-4 w-fit">
              <Link href={`/stores/${storeId}/followers`}>View all followers</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automations</CardTitle>
            <CardDescription>
              Manage welcome, DM, back-in-stock, and AI automations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${storeId}/automations`}>
                View automations
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand Deals</CardTitle>
            <CardDescription>
              Track sponsor leads and deal pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${storeId}/brand-deals`}>
                View brand deals
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Affiliate Center</CardTitle>
            <CardDescription>
              Enroll ambassadors and track referrals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${storeId}/affiliates`}>
                View affiliates
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Media Kit</CardTitle>
            <CardDescription>
              Shareable creator portfolio and brand pitch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${storeId}/media-kit`}>
                View media kit
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Connected stores, Meta accounts, and health status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/stores/${storeId}/integrations`}>
                View integrations
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}