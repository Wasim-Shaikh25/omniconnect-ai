import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PricingCards } from "@/components/pricing-cards";
import {
  MessageCircle,
  ShoppingBag,
  BarChart3,
  Users,
  Zap,
  TrendingUp,
} from "lucide-react";

const capabilities = [
  {
    icon: MessageCircle,
    title: "DM & comment automation",
    description: "AI replies to Instagram and Facebook messages, mentions, and comments 24/7.",
  },
  {
    icon: ShoppingBag,
    title: "Shopify + Meta commerce",
    description: "Sync products, push shoppable posts, and track which content drives orders.",
  },
  {
    icon: BarChart3,
    title: "Marketing analytics",
    description: "Content, audience, product, and campaign views built around growth questions.",
  },
  {
    icon: Users,
    title: "Competitor intelligence",
    description: "Benchmark competitors, detect content changes, and adapt your strategy.",
  },
  {
    icon: Zap,
    title: "First-time follower campaigns",
    description: "Auto-welcome new followers with personalized coupons and conversation starters.",
  },
  {
    icon: TrendingUp,
    title: "AI content ideas",
    description: "Generate Reels, captions, and hashtags grounded in your best posts and trends.",
  },
];

export default function Home() {
  return (
    <div className="page-container flex min-h-screen flex-col">
      <section className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-24 text-center">
        <span className="mb-4 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          AI Marketing & Commerce for Instagram and Facebook Businesses
        </span>
        <h1 className="max-w-4xl text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          Turn every follower interaction into a{" "}
          <span className="text-primary">marketing decision</span>
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          OmniConnect AI connects your Shopify store, Meta pages, and customer conversations into
          one daily marketing workflow: content ideas, competitor insights, DM automation, and
          post-to-order attribution.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="mb-10 text-center text-3xl font-semibold">
          Built for the jobs you do every day
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c) => (
            <Card key={c.title}>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{c.title}</CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Included across all plans
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="mb-10 text-center text-3xl font-semibold">Simple, transparent pricing</h2>
        <PricingCards showFree={true} ctaTarget="signup" />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No credit card required for the free plan. Upgrade in settings at any time.
        </p>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-semibold">Ready to grow on Meta?</h2>
        <p className="mt-4 text-muted-foreground">
          Join businesses using OmniConnect AI to convert followers into customers.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/register">Create your free account</Link>
        </Button>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        OmniConnect AI — AI Marketing & Commerce Platform for Instagram and Facebook Businesses.
      </footer>
    </div>
  );
}
