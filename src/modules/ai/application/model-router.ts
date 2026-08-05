import { env } from "@/shared/config";

export type AIOperation =
  | "reply"
  | "brain"
  | "captions"
  | "post-ideas"
  | "trends"
  | "competitor-analysis"
  | "welcome-message"
  | "default";

// Feature names used by OpenRouter model routing.
export type AIModelFeature =
  | "reply"
  | "dashboard"
  | "content"
  | "inspector"
  | "analysis";

export interface ModelOverrides {
  reply?: string;
  dashboard?: string;
  content?: string;
  inspector?: string;
  analysis?: string;
}

export interface ModelSelection {
  model: string;
  budget: "low" | "medium" | "high";
}

export interface SubscriptionPlan {
  name: string;
  allowedModels: string[];
}

export function getModelForFeature(
  feature: AIModelFeature,
  overrides?: ModelOverrides | null,
): string {
  switch (feature) {
    case "reply":
      return overrides?.reply ?? env.AI_REPLY_MODEL ?? env.AI_DEFAULT_MODEL;
    case "dashboard":
      return overrides?.dashboard ?? env.AI_DASHBOARD_MODEL ?? env.AI_DEFAULT_MODEL;
    case "content":
      return overrides?.content ?? env.AI_CONTENT_MODEL ?? env.AI_DEFAULT_MODEL;
    case "inspector":
      return overrides?.inspector ?? env.AI_DEFAULT_MODEL;
    case "analysis":
      return overrides?.analysis ?? env.AI_ANALYSIS_MODEL ?? env.AI_DEFAULT_MODEL;
    default:
      return env.AI_DEFAULT_MODEL;
  }
}

export function validateModelAccess(model: string, plan: SubscriptionPlan): boolean {
  return plan.allowedModels.includes(model);
}

// Maps legacy AIOperation names to the feature space used by getModelForFeature.
function operationToFeature(operation: AIOperation): AIModelFeature {
  switch (operation) {
    case "reply":
    case "welcome-message":
      return "reply";
    case "brain":
    case "trends":
      return "analysis";
    case "captions":
    case "post-ideas":
      return "content";
    case "competitor-analysis":
      return "inspector";
    default:
      return "analysis";
  }
}

export function selectModel(
  operation: AIOperation,
  configuredModel?: string | null,
  overrides?: ModelOverrides | null,
): ModelSelection {
  const feature = operationToFeature(operation);
  const model = configuredModel ?? getModelForFeature(feature, overrides);

  let budget: ModelSelection["budget"] = "low";
  if (model.includes("claude-3-5-sonnet") || model.includes("gpt-4o") || model.includes("gpt-4-turbo")) {
    budget = "high";
  } else if (
    model.includes("claude-3-haiku") ||
    model.includes("llama") ||
    model.includes("gpt-4o-mini") ||
    model.includes("gpt-3.5")
  ) {
    budget = "low";
  } else {
    budget = "medium";
  }

  return { model, budget };
}

export function getDefaultModel(): string {
  return env.AI_DEFAULT_MODEL;
}
