export type IntelligenceFeature =
  | "dailyBrief"
  | "marketingBrain"
  | "nextBestAction"
  | "signalDetection"
  | "predictions"
  | "hypotheses"
  | "businessLearnings";

export function canUseIntelligenceFeature(
  plan: string | null | undefined,
  feature: IntelligenceFeature,
): boolean {
  const tier = (plan ?? "FREE").toUpperCase();
  switch (feature) {
    case "dailyBrief":
      return true;
    case "predictions":
      return tier === "BUSINESS";
    case "marketingBrain":
    case "nextBestAction":
    case "signalDetection":
    case "hypotheses":
    case "businessLearnings":
      return tier === "PRO" || tier === "BUSINESS";
    default:
      return false;
  }
}
