import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const modules: { name: string; description: string }[] = [
  { name: "Authentication", description: "Email + Google login, JWT, RBAC (Admin/Owner/Staff)." },
  { name: "eCommerce Connectors", description: "Provider-agnostic framework; Shopify first." },
  { name: "Meta Integration", description: "Instagram & Facebook webhooks, messages, comments." },
  { name: "AI Assistant", description: "Per-page configurable, multi-model-ready assistant." },
  { name: "Follower Campaigns", description: "Auto personalized welcome coupons for new followers." },
  { name: "Customer Memory (CRM)", description: "Unified profiles for personalized conversations." },
  { name: "Marketing Insights", description: "AI reports, trends, and growth recommendations." },
  { name: "Human Takeover", description: "Pause AI and take over any conversation, then resume." },
  { name: "Notifications", description: "Real-time in-app + email alerts across events." },
];

export default function Home() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col px-4 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="OmniConnect AI" className="h-8 w-8" />
          <span className="text-lg font-semibold">OmniConnect AI</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <span className="mb-4 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          Prototype · Phase 1
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          The intelligent bridge between{" "}
          <span className="text-primary">Meta</span> and your{" "}
          <span className="text-primary">store</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">
          OmniConnect AI monitors Instagram & Facebook conversations, replies with a
          configurable AI assistant, onboards new followers with personalized discounts, and
          surfaces AI-driven marketing insights — connected to Shopify and beyond.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Get started</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Card key={m.name}>
            <CardHeader>
              <CardTitle>{m.name}</CardTitle>
              <CardDescription>{m.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Loosely-coupled module · DDD layered · event-driven
            </CardContent>
          </Card>
        ))}
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        OmniConnect AI — built spec-first with a loosely-coupled, DDD architecture.
      </footer>
    </main>
  );
}
