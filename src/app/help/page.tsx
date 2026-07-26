"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
          <li><strong>Model:</strong> OpenAI model name (e.g. gpt-4o-mini).</li>
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
          customer consent settings before sending profile data to OpenAI.
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
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Help center</h1>
          <p className="text-sm text-muted-foreground">Search for guides on using OmniConnect AI.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">Back home</Link>
        </Button>
      </header>

      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search topics, keywords, or features..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No help topics match your search.</p>
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
    </main>
  );
}
