import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/pricing-cards";

export const metadata = {
  title: "Pricing — OmniConnect AI",
  description:
    "Free, Starter ($4.99/mo), and Pro ($9.99/mo) plans for AI marketing and commerce on Instagram and Facebook.",
};

export default function PricingPage() {
  return (
    <main className="container mx-auto px-4 py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Simple pricing for Meta-first businesses
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
          Start free, then upgrade to Starter or Pro when you are ready to scale your AI marketing
          and commerce workflow.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Start free</Link>
          </Button>
        </div>
      </header>

      <PricingCards showFree={true} ctaTarget="signup" />

      <section className="mx-auto mt-16 max-w-3xl space-y-4 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Frequently asked questions</h2>
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer font-medium text-foreground">
            Can I change plans later?
          </summary>
          <p className="mt-2">
            Yes. Visit <strong>Settings → Billing</strong> inside the app to upgrade or downgrade.
          </p>
        </details>
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer font-medium text-foreground">
            What payment methods do you accept?
          </summary>
          <p className="mt-2">
            We use Stripe for secure card payments. All major cards and wallets are supported.
          </p>
        </details>
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer font-medium text-foreground">
            Is there a free trial?
          </summary>
          <p className="mt-2">
            The Free plan is free forever. Starter and Pro are billed monthly and you can cancel any
            time.
          </p>
        </details>
      </section>
    </main>
  );
}
