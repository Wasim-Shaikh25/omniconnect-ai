import type { RiskTier } from "../domain/types";

export interface AiResponseInput {
  conclusion: string;
  evidencePeriod: string;
  likelyDrivers: string[];
  confidence: string;
  uncertainty: string;
  missingData: string[];
  recommendedAction: string;
  expectedResultRange: string;
  previewLink?: string | null;
}

export interface AiResponse {
  conclusion: string;
  evidencePeriod: string;
  likelyDrivers: string[];
  confidence: string;
  uncertainty: string;
  missingData: string[];
  recommendedAction: string;
  expectedResultRange: string;
  previewLink: string | null;
  rendered: string;
}

export interface ToolCall {
  tool: string;
  params: unknown;
  idempotencyKey: string;
}

export interface ToolValidationResult {
  allowed: boolean;
  reason: string;
}

export interface RiskTierEnforcementInput {
  actionType: string;
  audienceSize: number;
  discountPct: number;
  userRole: string | null;
}

export interface RiskTierEnforcementResult {
  tier: RiskTier;
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
}

const ALLOWED_TOOLS = new Map<string, string[]>([
  ["generateCoupon", ["ADMIN", "STORE_OWNER", "STAFF"]],
  ["createDmCampaign", ["ADMIN", "STORE_OWNER", "STAFF"]],
  ["takeOverConversation", ["ADMIN", "STORE_OWNER", "STAFF"]],
  ["syncProducts", ["ADMIN", "STORE_OWNER"]],
  ["updateAIConfiguration", ["ADMIN", "STORE_OWNER"]],
]);

const PROMPT_INJECTION_PATTERNS = [
  /ignore previous instructions?/i,
  /system prompt/i,
  /you are now .* assistant/i,
  /DAN|do anything now/i,
  /ignore all (above|prior)/i,
];

const PII_PATTERNS = [
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // credit-card-ish
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // email
];

export function makeAiGovernanceService() {
  return {
    formatResponse(input: AiResponseInput): AiResponse {
      const rendered = [
        `**Conclusion:** ${input.conclusion}`,
        `**Evidence period:** ${input.evidencePeriod}`,
        `**Likely drivers:** ${input.likelyDrivers.join("; ") || "Unknown"}`,
        `**Confidence / uncertainty:** ${input.confidence} — ${input.uncertainty}`,
        `**Missing or stale data:** ${input.missingData.join("; ") || "None flagged"}`,
        `**Recommended action:** ${input.recommendedAction}`,
        `**Expected result:** ${input.expectedResultRange}`,
        input.previewLink ? `**Preview / execute:** ${input.previewLink}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      return {
        ...input,
        previewLink: input.previewLink ?? null,
        rendered,
      };
    },

    validateToolCall(toolCall: ToolCall, userRole: string | null): ToolValidationResult {
      const allowedRoles = ALLOWED_TOOLS.get(toolCall.tool);
      if (!allowedRoles) {
        return { allowed: false, reason: `Tool "${toolCall.tool}" is not in the allowlist.` };
      }
      if (!toolCall.idempotencyKey || toolCall.idempotencyKey.length < 8) {
        return { allowed: false, reason: "Tool call must include a valid idempotency key." };
      }
      if (typeof toolCall.params !== "object" || toolCall.params === null) {
        return { allowed: false, reason: "Tool params must be an object." };
      }
      if (!userRole || !allowedRoles.includes(userRole)) {
        return { allowed: false, reason: `Role "${userRole ?? "none"}" cannot use tool "${toolCall.tool}".` };
      }
      return { allowed: true, reason: "OK" };
    },

    enforceRiskTier(input: RiskTierEnforcementInput): RiskTierEnforcementResult {
      let tier: RiskTier = "TIER_1";
      if (input.audienceSize > 1000 || input.discountPct > 25) tier = "TIER_4";
      else if (input.audienceSize > 500 || input.discountPct > 15) tier = "TIER_3";
      else if (input.audienceSize > 100 || input.discountPct > 5) tier = "TIER_2";

      const approvers: Record<RiskTier, string[]> = {
        TIER_1: ["ADMIN", "STORE_OWNER", "STAFF"],
        TIER_2: ["ADMIN", "STORE_OWNER", "STAFF"],
        TIER_3: ["ADMIN", "STORE_OWNER"],
        TIER_4: ["ADMIN"],
      };

      const userCanApprove = input.userRole !== null && approvers[tier].includes(input.userRole);

      if (tier === "TIER_4" && !userCanApprove) {
        return {
          tier,
          allowed: false,
          requiresApproval: true,
          reason: "High-risk action requires Admin approval.",
        };
      }
      if (!userCanApprove) {
        return {
          tier,
          allowed: false,
          requiresApproval: true,
          reason: `Risk tier ${tier} requires ${approvers[tier].join(" or ")} approval.`,
        };
      }
      return { tier, allowed: true, requiresApproval: false, reason: "Approved" };
    },

    applyTrustLanguage(text: string): string {
      const unsafePhrases: Array<[RegExp, string]> = [
        [/\bcaused\b/gi, "was likely associated with"],
        [/\bwill increase\b/gi, "is estimated to increase"],
        [/\bwill decrease\b/gi, "is estimated to decrease"],
        [/\bguaranteed\b/gi, "not guaranteed; estimated"],
        [/\bdefinitely\b/gi, "likely"],
        [/\bproves\b/gi, "is consistent with"],
      ];

      let result = text;
      for (const [pattern, replacement] of unsafePhrases) {
        result = result.replace(pattern, replacement);
      }

      result = result.replace(/(\d+)%/, (_m, num) => `${num}% (estimate; assumptions apply)`);

      return result;
    },

    sanitizeInput(text: string): { sanitized: string; blocked: boolean; reasons: string[] } {
      const reasons: string[] = [];
      let sanitized = text;

      for (const pattern of PROMPT_INJECTION_PATTERNS) {
        if (pattern.test(sanitized)) {
          reasons.push("Potential prompt-injection pattern detected.");
          sanitized = sanitized.replace(pattern, "[redacted]");
        }
      }

      for (const pattern of PII_PATTERNS) {
        if (pattern.test(sanitized)) {
          reasons.push("Potential PII detected and redacted.");
          sanitized = sanitized.replace(pattern, "[redacted]");
        }
      }

      return { sanitized, blocked: reasons.length > 0, reasons };
    },
  };
}

export type AiGovernanceService = ReturnType<typeof makeAiGovernanceService>;
