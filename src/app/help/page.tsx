"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HelpCircle } from "lucide-react";

interface HelpSection {
  title: string;
  keywords: string[];
  content: React.ReactNode;
}

const helpSections: HelpSection[] = [
  {
    title: "Getting started",
    keywords: ["setup", "register", "login", "organization", "tenant"],
    content: (
      <>
        <p className="mb-2">
          OmniConnect AI is a multi-tenant SaaS that links your Shopify store to Facebook and
          Instagram and automates customer engagement with AI.
        </p>
        <ol className="ml-5 list-decimal space-y-1">
          <li>Register an account and create an organization.</li>
          <li>Create a store from the Stores page.</li>
          <li>Connect your Shopify store (or use the built-in demo provider).</li>
          <li>Sync products so the catalog is available.</li>
          <li>Connect your Meta page or Instagram Business account.</li>
          <li>Configure the AI assistant and welcome campaign.</li>
        </ol>
      </>
    ),
  },
  {
    title: "Pricing and plans",
    keywords: ["price", "plan", "billing", "subscription", "upgrade", "stripe", "free", "starter", "pro"],
    content: (
      <>
        <p className="mb-2">We offer three simple plans:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Free — $0:</strong> 1 store, 1 Meta account, 50 AI replies/month, basic analytics.</li>
          <li><strong>Starter — $4.99/mo:</strong> up to 3 stores, unlimited Meta accounts, 500 AI replies/month, advanced analytics, DM automation, competitor tracking, and AI content ideas.</li>
          <li><strong>Pro — $9.99/mo:</strong> unlimited stores and AI replies, competitor benchmarking, brand-deal pipeline, team seats, priority support, and custom AI tuning.</li>
        </ul>
        <p className="mt-2">
          Upgrade from <strong>Settings → Billing</strong>. Payments are processed securely by Stripe.
          You can cancel at any time.
        </p>
      </>
    ),
  },
  {
    title: "Connecting Shopify",
    keywords: ["shopify", "ecommerce", "connect", "sync", "products", "catalog"],
    content: (
      <>
        <p className="mb-2">
          On a store page, use the <strong>Connection</strong> card to link Shopify. In development
          you can leave the fields blank to use the Mock provider.
        </p>
        <p>
          After connecting, click <strong>Sync products</strong> to import the product catalog. This
          local catalog is used for AI product recommendations, shoppable media tags, and
          back-in-stock alerts.
        </p>
      </>
    ),
  },
  {
    title: "Meta / Instagram / Facebook connection",
    keywords: ["meta", "facebook", "instagram", "webhook", "page", "account"],
    content: (
      <>
        <p className="mb-2">
          Link a Facebook Page or Instagram Business account in the <strong>Meta integration</strong>{" "}
          section. In production the app uses the Meta Graph API and webhooks to receive messages,
          comments, and follower events.
        </p>
        <p>
          For local testing, use the <strong>Dev simulator</strong> on the store page to simulate
          inbound messages, follows, and comments without a live Meta app.
        </p>
      </>
    ),
  },
  {
    title: "AI assistant configuration",
    keywords: ["ai", "assistant", "prompt", "tone", "model", "gpt"],
    content: (
      <>
        <p className="mb-2">
          The AI assistant replies to customer messages automatically. Configure it from the store
          page:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Model:</strong> OpenRouter model id (e.g. openai/gpt-4o-mini).</li>
          <li><strong>Tone:</strong> desired personality for replies.</li>
          <li><strong>System prompt:</strong> global instructions for the assistant.</li>
          <li><strong>Strategy fields:</strong> welcome, coupon, sales, and escalation rules.</li>
        </ul>
        <p className="mt-2">
          If the assistant starts a reply with <code>[ESCALATE]</code>, the conversation is marked
          for human handoff.
        </p>
      </>
    ),
  },
  {
    title: "Marketing Brain and daily brief",
    keywords: ["business brain", "marketing brain", "daily brief", "insights", "recommendations"],
    content: (
      <>
        <p className="mb-2">
          The Marketing Brain page gives you a daily summary: follower growth, content opportunities,
          competitor alerts, products to promote, DM and comment insights, best posting time, and a
          recommended Reel.
        </p>
        <p>
          It uses the intelligence layer to combine signals from analytics, competitors, DMs, and
          product catalog into one prioritized set of actions.
        </p>
      </>
    ),
  },
  {
    title: "Conversations and human takeover",
    keywords: ["conversation", "chat", "dm", "message", "human", "takeover"],
    content: (
      <>
        <p className="mb-2">
          The <strong>Conversations</strong> page lists every customer thread. Click a thread to view
          messages and toggle between AI and human control.
        </p>
        <p>
          Click <strong>Take over</strong> to pause AI replies; staff can then type responses. Click{" "}
          <strong>Resume AI</strong> to return control to the assistant.
        </p>
      </>
    ),
  },
  {
    title: "First-time follower campaign",
    keywords: ["follower", "welcome", "coupon", "campaign", "discount"],
    content: (
      <>
        <p className="mb-2">
          Automatically greet new Instagram/Facebook followers with a personalized coupon. Enable it
          from <strong>First-time follower campaign</strong> under a store.
        </p>
        <p>
          When a follow event arrives, the system creates a unique discount code, records it in the
          customer profile, and opens a conversation with a welcome message.
        </p>
      </>
    ),
  },
  {
    title: "Commerce catalog and shoppable media",
    keywords: ["commerce", "catalog", "instagram shop", "shoppable", "product tag", "meta catalog"],
    content: (
      <>
        <p className="mb-2">
          Open <strong>Commerce catalog</strong> from a store page to push products to Meta and create
          shoppable posts.
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Sync catalog:</strong> creates Meta product mappings for the current product list.</li>
          <li><strong>Shoppable media:</strong> create an Instagram Post, Reel, or Story and tag products from the synced catalog.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Comments, mentions, and leads",
    keywords: ["comment", "mention", "lead", "intent", "sentiment", "reply", "hide"],
    content: (
      <>
        <p className="mb-2">
          The <strong>Comments & mentions</strong> page queues inbound comments. Each comment is
          classified by intent and sentiment and receives a suggested auto-reply. Staff can reply or
          hide comments manually.
        </p>
        <p>
          The <strong>Leads</strong> page captures leads from Lead Ads, DMs, comments, and follows and
          scores them based on source and intent signals.
        </p>
      </>
    ),
  },
  {
    title: "Analytics and attribution",
    keywords: ["analytics", "content", "audience", "product", "campaign", "attribution", "orders"],
    content: (
      <>
        <p className="mb-2">
          The <strong>Analytics</strong> workflow is organized around marketing questions:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Content:</strong> which posts sold products, gained followers, and started conversations.</li>
          <li><strong>Audience:</strong> who is growing, leaving, buying, and commenting.</li>
          <li><strong>Product:</strong> which products appear in viral content and convert poorly.</li>
          <li><strong>Campaign:</strong> which campaigns generated revenue, followers, and conversations.</li>
        </ul>
        <p className="mt-2">
          Post-to-order attribution uses a 7-day window to attribute orders to the most recent owned
          media post before the order.
        </p>
      </>
    ),
  },
  {
    title: "Growth: UGC, ambassadors, and DM campaigns",
    keywords: ["ugc", "ambassador", "referral", "campaign", "dm", "back in stock", "abandoned cart"],
    content: (
      <>
        <p className="mb-2">
          The <strong>Growth</strong> page is a hub for advocacy and conversational commerce:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>UGC collection:</strong> save public mentions/tags and request or approve usage rights.</li>
          <li><strong>Ambassadors:</strong> enroll creators, set discount/commission rates, and record referral orders with automatic commission calculation.</li>
          <li><strong>DM campaigns:</strong> create welcome, abandoned-cart, back-in-stock, review-request, and re-engagement campaigns; send manually or schedule.</li>
          <li><strong>Back-in-stock alerts:</strong> subscribe customers to a product and notify them when stock is available.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Notifications",
    keywords: ["notification", "badge", "alert", "unread"],
    content: (
      <>
        <p className="mb-2">
          The bell icon in the top bar shows unread notifications. The{" "}
          <strong>Notifications</strong> page lists all events such as new messages, followers,
          coupons, escalations, and campaign activity. Mark items as read to clear the badge.
        </p>
      </>
    ),
  },
  {
    title: "Security and privacy",
    keywords: ["security", "privacy", "encryption", "token", "consent", "gdpr"],
    content: (
      <>
        <p className="mb-2">
          Third-party access tokens are encrypted at rest using AES-256-GCM. The AI assistant respects
          customer consent settings before sending profile data to the configured OpenRouter model.
        </p>
        <p>
          Webhook endpoints verify Meta HMAC signatures and Stripe webhook signatures. All mutating
          server actions are scoped by organization via the tenant guard.
        </p>
      </>
    ),
  },
  {
    title: "Deploying to production",
    keywords: ["deploy", "production", "vercel", "fly", "docker", "env", "environment"],
    content: (
      <>
        <p className="mb-2">High-level steps:</p>
        <ol className="ml-5 list-decimal space-y-1">
          <li>Provision PostgreSQL 15+ and Redis 7+.</li>
          <li>Copy <code>.env.production</code> from the repo and fill in secrets.</li>
          <li>Run <code>npx prisma migrate deploy</code> to apply database migrations.</li>
          <li>Build the Next.js app with <code>npm run build</code>.</li>
          <li>Start the web server and the BullMQ worker.</li>
          <li>Register production webhook URLs in Meta and Stripe dashboards.</li>
        </ol>
        <p className="mt-2">
          See <code>docs/deployment.md</code> and <code>README.md</code> in the repository for the full guide.
        </p>
      </>
    ),
  },
  {
    title: "Troubleshooting",
    keywords: ["error", "fix", "debug", "not working", "fail"],
    content: (
      <>
        <p className="mb-2">Common issues:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>No products showing:</strong> make sure the store is connected and products are synced.</li>
          <li><strong>AI not replying:</strong> check that the conversation is in AI_ACTIVE mode and the AI settings are saved.</li>
          <li><strong>Simulated events not appearing:</strong> confirm the correct store is selected and refresh the target page.</li>
          <li><strong>Meta webhooks failing:</strong> verify the webhook URL and token in your Meta app dashboard.</li>
          <li><strong>Checkout not working:</strong> confirm Stripe keys and price IDs are set in your environment.</li>
          <li><strong>Build errors after schema changes:</strong> run <code>npx prisma generate</code> to refresh the Prisma client.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Billing and SaaS coupons",
    keywords: ["billing", "coupon", "discount", "stripe", "checkout", "upgrade", "plan", "promo"],
    content: (
      <>
        <p className="mb-2">
          Upgrade or downgrade from <strong>Settings → Billing</strong>. Choose Free, Starter, or
          Pro. If you have a coupon code, enter it before choosing a plan; the discount is applied
          at Stripe Checkout.
        </p>
        <p>
          Coupons are percentage discounts and may be limited to specific plans, a maximum number of
          uses, or an expiration date.
        </p>
      </>
    ),
  },
  {
    title: "Support tickets",
    keywords: ["support", "ticket", "help", "issue", "bug", "contact"],
    content: (
      <>
        <p className="mb-2">
          Open <strong>Support</strong> from the top navigation to create a ticket. Describe the
          issue, choose a category (Billing, Technical, Feature request, or Other), and submit.
        </p>
        <p>
          You can view your tickets and their status at any time. The platform team can update status,
          priority, assign the ticket, and reply.
        </p>
      </>
    ),
  },
  {
    title: "Platform admin (founder)",
    keywords: ["admin", "super admin", "founder", "tenants", "users", "platform"],
    content: (
      <>
        <p className="mb-2">
          Users with the super-admin flag can open <strong>Admin</strong> from the top navigation.
          The admin surface is for platform management only:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Dashboard:</strong> counts for organizations, users, coupons, open tickets, and recent logs.</li>
          <li><strong>Organizations:</strong> list every tenant on the platform.</li>
          <li><strong>Users:</strong> list all accounts and manage super-admin access.</li>
          <li><strong>Coupons:</strong> create SaaS promotion codes with discount %, plan eligibility, max uses, and expiration.</li>
          <li><strong>Tickets:</strong> triage, assign, and reply to user support tickets.</li>
          <li><strong>Logs:</strong> filter and inspect application/system logs by level and service.</li>
        </ul>
      </>
    ),
  },
  {
    title: "System logs",
    keywords: ["logs", "system log", "error", "warn", "debug", "admin"],
    content: (
      <>
        <p className="mb-2">
          Super admins can view structured system logs in <strong>Admin → Logs</strong>. Logs include
          DEBUG, INFO, WARN, ERROR, and FATAL events with service name, message, and metadata.
        </p>
        <p>
          Use the level and service filters to triage operational issues. Logs never include secrets,
          tokens, or payment payloads.
        </p>
      </>
    ),
  },
  {
    title: "Daily Marketing workflow",
    keywords: ["daily marketing", "workflow", "today", "brief", "priority"],
    content: (
      <>
        <p className="mb-2">
          Open a store and click <strong>Daily Marketing</strong> for a prioritized daily brief: what
          to post, which product to push, DM and comment opportunities, competitor changes, trending
          hashtags, and the best posting time.
        </p>
        <p>
          The Engagement, Growth, and Revenue tabs organize related actions into focused workflows so
          you do not have to jump between settings pages.
        </p>
      </>
    ),
  },
  {
    title: "Content Studio",
    keywords: ["content", "caption", "post ideas", "reel", "hashtag", "trends"],
    content: (
      <>
        <p className="mb-2">
          From a store, open <strong>Content</strong> to generate post ideas, captions, hooks, and
          hashtags. The AI uses your product catalog, marketing memory, competitor changes, and
          trending hashtags.
        </p>
        <p>
          Each suggestion shows why it was recommended and links to the product or trend that inspired
          it.
        </p>
      </>
    ),
  },
  {
    title: "Orders and revenue",
    keywords: ["orders", "revenue", "sales", "checkout", "purchase"],
    content: (
      <>
        <p className="mb-2">
          The <strong>Orders</strong> page lists recent orders pulled from your Shopify store (or the
          demo provider). Use the Revenue workflow to see revenue trends and receive recommendations
          when orders decline.
        </p>
      </>
    ),
  },
  {
    title: "Brand Deals",
    keywords: ["brand deal", "collaboration", "creator", "pipeline"],
    content: (
      <>
        <p className="mb-2">
          Track brand-deal opportunities through stages: Lead, Negotiating, Contracted, Delivered,
          Paid, and Closed. Add deals from a store page and move them through the pipeline as they
          progress.
        </p>
      </>
    ),
  },
  {
    title: "Affiliates and Media Kit",
    keywords: ["affiliate", "ambassador", "referral", "media kit", "creator"],
    content: (
      <>
        <p className="mb-2">
          Enroll ambassadors, generate referral codes, and record referral orders from a store. The
          Affiliate Center shows commissions and earnings.
        </p>
        <p>
          The Media Kit page produces a shareable summary of your store KPIs, top products, and
          collaboration pitch for creators and brands.
        </p>
      </>
    ),
  },
  {
    title: "Automations and goals",
    keywords: ["automation", "goal", "template", "guardrail", "campaign"],
    content: (
      <>
        <p className="mb-2">
          <strong>Automations</strong> is a hub for welcome campaigns, abandoned-cart DMs,
          back-in-stock alerts, comment-to-DM unlock, review requests, re-engagement, and AI-driven
          goals.
        </p>
        <p>
          Goal-based automations include guardrails for audience size, discount caps, consent,
          frequency, and actions per day. Each template shows a risk tier and workflow-acceptance
          report.
        </p>
      </>
    ),
  },
  {
    title: "Customer journeys",
    keywords: ["journey", "customer journey", "touchpoint", "attribution"],
    content: (
      <>
        <p className="mb-2">
          Customer journeys connect post views, follows, DMs, coupon sends, and orders into one
          timeline. The <strong>Journeys</strong> explorer shows how customers move from discovery to
          purchase and back to advocacy.
        </p>
      </>
    ),
  },
  {
    title: "Unified Inbox",
    keywords: ["inbox", "messages", "dm", "conversation", "all stores"],
    content: (
      <>
        <p className="mb-2">
          The global <strong>Inbox</strong> lists conversations across all your stores. Filter by
          channel, status, or search, and take over or resume AI control from any thread.
        </p>
      </>
    ),
  },
  {
    title: "Customers and CRM",
    keywords: ["customer", "crm", "profile", "consent", "tags", "lead"],
    content: (
      <>
        <p className="mb-2">
          The <strong>Customers</strong> page lists contacts captured from Meta DMs, comments,
          follows, and orders. Click a customer to view their profile, lifecycle stage, consent,
          tags, interests, and intelligence summary.
        </p>
      </>
    ),
  },
  {
    title: "Integrations catalog",
    keywords: ["integration", "shopify", "meta", "connected", "catalog"],
    content: (
      <>
        <p className="mb-2">
          Each store has an <strong>Integrations</strong> page showing eCommerce and Meta connection
          status, provider/channel, domain/account id, product count, and the date connected. Connect
          or review health from one place.
        </p>
      </>
    ),
  },
  {
    title: "Settings, quality, and rollout",
    keywords: ["settings", "profile", "role", "audit", "quality", "rollout", "operating model"],
    content: (
      <>
        <p className="mb-2">
          Use <strong>Settings</strong> to manage your profile, team roles, billing, and audit log.
        </p>
        <p>
          Quality &amp; Risk runs data, intelligence, AI, and action checks. Rollout and Operating
          Model pages are internal-facing planning tools for managing feature gates and milestones.
        </p>
      </>
    ),
  },
];

export default function HelpPage() {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return helpSections;
    return helpSections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.includes(q)),
    );
  }, [query]);

  return (
    <div className="page-container">
      <div className="container max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Help center"
          description="Search for guides on using OmniConnect AI."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Help" },
          ]}
        />

        <div className="section">
          <Card>
            <CardContent className="pt-6">
              <Input
                type="search"
                placeholder="Search topics, keywords, or features..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full"
              />
            </CardContent>
          </Card>
        </div>

        <div className="section">
          {filtered.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No help topics found"
              description="Try a different search term or browse all topics."
            />
          ) : (
            <div className="grid gap-4">
              {filtered.map((section) => (
                <Card key={section.title}>
                  <CardHeader>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-relaxed text-muted-foreground">
                    {section.content}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
