export type AIOperation =
  | "reply"
  | "brain"
  | "captions"
  | "post-ideas"
  | "trends"
  | "competitor-analysis"
  | "welcome-message"
  | "default";

export interface ModelSelection {
  model: string;
  budget: "low" | "medium" | "high";
}

export function selectModel(operation: AIOperation, configuredModel?: string | null): ModelSelection {
  const base = configuredModel ?? "gpt-4o-mini";
  switch (operation) {
    case "reply":
      return { model: base, budget: "low" };
    case "brain":
      return { model: base, budget: "medium" };
    case "captions":
      return { model: base, budget: "low" };
    case "post-ideas":
    case "trends":
      return { model: base, budget: "medium" };
    case "competitor-analysis":
      return { model: base, budget: "medium" };
    case "welcome-message":
      return { model: base, budget: "low" };
    default:
      return { model: base, budget: "low" };
  }
}
