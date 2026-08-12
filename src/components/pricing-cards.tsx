"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { Plan, PLAN_FEATURES } from "@/modules/workspaces";

export interface PricingCardsProps {
  currentPlan?: Plan;
  compact?: boolean;
  showFree?: boolean;
  ctaTarget?: "signup" | "checkout";
}

export function PricingCards({
  currentPlan = Plan.FREE,
  compact = false,
  showFree = true,
  ctaTarget = "checkout",
}: PricingCardsProps) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");

  const plans = [Plan.FREE, Plan.PRO, Plan.BUSINESS].filter(
    (p) => showFree || p !== Plan.FREE,
  );

  async function selectPlan(plan: Plan) {
    if (plan === Plan.FREE || ctaTarget === "signup") {
      router.push("/register");
      return;
    }
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/razorpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, couponCode: couponCode.trim() || undefined }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (res.ok && json.url) {
        window.location.href = json.url;
      } else {
        alert(json.error ?? "Checkout failed. Please try again.");
        setLoadingPlan(null);
      }
    } catch {
      alert("Checkout failed. Please try again.");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="coupon">Coupon code (optional)</Label>
          <Input
            id="coupon"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="WELCOME20"
          />
        </div>
      </div>
      <div
        className={`grid gap-6 ${compact ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-3"}`}
      >
      {plans.map((plan) => {
        const meta = PLAN_FEATURES[plan];
        const isCurrent = plan === currentPlan;
        return (
          <Card
            key={plan}
            className={`flex flex-col ${plan === Plan.BUSINESS ? "border-primary ring-1 ring-primary" : ""}`}
          >
            <CardHeader className={compact ? "pb-2" : ""}>
              <CardTitle className="flex items-baseline justify-between">
                <span>{meta.label}</span>
                <span className="text-2xl font-bold">{meta.price}</span>
              </CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <ul className="mb-6 flex-1 space-y-2 text-sm text-muted-foreground">
                {meta.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan === Plan.BUSINESS ? "default" : "outline"}
                disabled={isCurrent || loadingPlan === plan}
                onClick={() => selectPlan(plan)}
              >
                {loadingPlan === plan ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : isCurrent ? (
                  "Current plan"
                ) : plan === Plan.FREE ? (
                  "Get started free"
                ) : ctaTarget === "signup" ? (
                  "Get started"
                ) : (
                  "Choose plan"
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
}
