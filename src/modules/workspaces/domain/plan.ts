export enum Plan {
  FREE = "FREE",
  PRO = "PRO",
  BUSINESS = "BUSINESS",
}

export function isPlan(value: string | null | undefined): value is Plan {
  return value === Plan.FREE || value === Plan.PRO || value === Plan.BUSINESS;
}

export function parsePlan(value: string | null | undefined): Plan {
  return isPlan(value) ? value : Plan.FREE;
}

/**
 * Enforceable per-plan entitlements. `null` means unlimited.
 * Keep in sync with the marketing copy in PLAN_FEATURES below.
 */
export interface PlanLimits {
  maxWorkspaces: number | null;
  maxProjects: number | null;
  maxStores: number | null;
  monthlyAiReplies: number | null;
  teamSeats: number | null;
  maxProfileInspectionsPerDay: number | null;
  maxCompetitors: number | null;
  maxAttributionLinksPerMonth: number | null;
  maxContentSchedulesPerMonth: number | null;
  allowedModels: string[];
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  [Plan.FREE]: {
    maxWorkspaces: 1,
    maxProjects: 1,
    maxStores: 1,
    monthlyAiReplies: 50,
    teamSeats: 1,
    maxProfileInspectionsPerDay: 3,
    maxCompetitors: 1,
    maxAttributionLinksPerMonth: 10,
    maxContentSchedulesPerMonth: 5,
    allowedModels: ["openai/gpt-4o-mini"],
  },
  [Plan.PRO]: {
    maxWorkspaces: null,
    maxProjects: 10,
    maxStores: 3,
    monthlyAiReplies: 500,
    teamSeats: 3,
    maxProfileInspectionsPerDay: 50,
    maxCompetitors: 10,
    maxAttributionLinksPerMonth: null,
    maxContentSchedulesPerMonth: null,
    allowedModels: ["openai/gpt-4o-mini", "openai/gpt-4o", "anthropic/claude-3-haiku"],
  },
  [Plan.BUSINESS]: {
    maxWorkspaces: null,
    maxProjects: null,
    maxStores: null,
    monthlyAiReplies: null,
    teamSeats: null,
    maxProfileInspectionsPerDay: null,
    maxCompetitors: null,
    maxAttributionLinksPerMonth: null,
    maxContentSchedulesPerMonth: null,
    allowedModels: ["*"],
  },
};

/** Returns true when `current` usage is still within the plan's limit. */
export function isWithinLimit(limit: number | null, current: number): boolean {
  return limit === null || current < limit;
}

export function planLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
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
      "3 profile inspections / day",
      "Basic analytics",
      "Manual DM & comment replies",
      "First-time-follower welcome",
    ],
  },
  [Plan.PRO]: {
    label: "Pro",
    price: "$4.99/mo",
    monthlyPrice: 499,
    description: "Grow with content ideas, campaigns, and deeper analytics.",
    features: [
      "Up to 3 stores",
      "Unlimited Meta accounts",
      "500 AI replies / month",
      "50 profile inspections / day",
      "Advanced analytics + trends",
      "DM automation",
      "Competitor tracking",
      "AI content ideas",
    ],
  },
  [Plan.BUSINESS]: {
    label: "Business",
    price: "$9.99/mo",
    monthlyPrice: 999,
    description: "Full marketing and commerce intelligence for scaling brands.",
    features: [
      "Unlimited stores",
      "Unlimited AI replies",
      "Unlimited profile inspections",
      "Competitor benchmarking",
      "Brand-deal pipeline",
      "Team seats",
      "Priority support",
      "Custom AI tuning",
    ],
  },
};
