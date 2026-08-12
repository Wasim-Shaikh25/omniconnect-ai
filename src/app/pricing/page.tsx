import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/pricing-cards";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Pricing — OmniConnect AI",
  description:
    "Free, Starter ($4.99/mo), and Pro ($9.99/mo) plans for AI marketing and commerce on Instagram and Facebook.",
};

export default function PricingPage() {
  return (
    <div className="page-container">
      <div className="container max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="section mb-10 text-center">
          <h1 className="page-title">Simple pricing for Meta-first businesses</h1>
          <p className="page-description mx-auto max-w-2xl text-balance">
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
        </div>

        <div className="section">
          <PricingCards showFree={true} ctaTarget="signup" />
        </div>

        <div className="section">
          <div className="mx-auto max-w-3xl space-y-3">
            <h2 className="section-title">Frequently asked questions</h2>
            <Card>
              <CardContent className="space-y-4 pt-6">
                <details className="group">
                  <summary className="cursor-pointer font-medium text-foreground hover:text-primary transition-colors">
                    Can I change plans later?
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground group-open:block hidden">
                    Yes. Visit <strong>Settings → Billing</strong> inside the app to upgrade or downgrade.
                  </p>
                </details>
                <details className="group">
                  <summary className="cursor-pointer font-medium text-foreground hover:text-primary transition-colors">
                    What payment methods do you accept?
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground group-open:block hidden">
                    We use Razorpay for secure card payments, UPI, wallets, and net banking.
                  </p>
                </details>
                <details className="group">
                  <summary className="cursor-pointer font-medium text-foreground hover:text-primary transition-colors">
                    Is there a free trial?
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground group-open:block hidden">
                    The Free plan is free forever. Pro and Business are billed monthly and you can cancel any
                    time.
                  </p>
                </details>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
