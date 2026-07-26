export enum Plan {
  FREE = "FREE",
  STARTER = "STARTER",
  PRO = "PRO",
}

export function isPlan(value: string | null | undefined): value is Plan {
  return value === Plan.FREE || value === Plan.STARTER || value === Plan.PRO;
}

export function parsePlan(value: string | null | undefined): Plan {
  return isPlan(value) ? value : Plan.FREE;
}

export const PLAN_FEATURES: Record<
  Plan,
  { label: string; price: string; monthlyPrice: number; description: string; features: string[] }
> = {
  [Plan.FREE]: {
    label: "Free",
    price: "$0",
    monthlyPrice: 0,
    description: "Try the core AI assistant on one store and one social account.",
    features: [
      "1 store",
      "1 Meta page/account",
      "50 AI replies / month",
      "Basic analytics",
      "Manual DM & comment replies",
      "First-time-follower welcome",
    ],
  },
  [Plan.STARTER]: {
    label: "Starter",
    price: "$4.99/mo",
    monthlyPrice: 499,
    description: "Grow with content ideas, campaigns, and deeper analytics.",
    features: [
      "Up to 3 stores",
      "Unlimited Meta accounts",
      "500 AI replies / month",
      "Advanced analytics + trends",
      "DM automation",
      "Competitor tracking",
      "AI content ideas",
    ],
  },
  [Plan.PRO]: {
    label: "Pro",
    price: "$9.99/mo",
    monthlyPrice: 999,
    description: "Full marketing and commerce intelligence for scaling brands.",
    features: [
      "Unlimited stores",
      "Unlimited AI replies",
      "Competitor benchmarking",
      "Brand-deal pipeline",
      "Team seats",
      "Priority support",
      "Custom AI tuning",
    ],
  },
};
